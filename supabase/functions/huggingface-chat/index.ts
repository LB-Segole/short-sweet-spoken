import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { assistantId, message, conversationHistory = [] } = await req.json()
    
    if (!assistantId || !message) {
      throw new Error('Assistant ID and message are required')
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Get assistant configuration
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .single()

    if (assistantError || !assistant) {
      throw new Error('Assistant not found')
    }

    console.log('🤖 Processing chat for assistant:', assistant.name)
    console.log('💬 User message:', message)
    console.log('📚 Conversation history length:', conversationHistory.length)

    // Prepare conversation context
    const systemPrompt = assistant.system_prompt || 'You are a helpful AI assistant.'
    
    // Build conversation context with recent history (keep last 10 messages to avoid token limits)
    const recentHistory = conversationHistory.slice(-10)
    
    let conversationContext = `System: ${systemPrompt}\n\n`
    
    // Add conversation history
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        conversationContext += `Human: ${msg.content}\n`
      } else if (msg.role === 'assistant') {
        conversationContext += `Assistant: ${msg.content}\n`
      }
    }
    
    // Add current message
    conversationContext += `Human: ${message}\nAssistant:`

    console.log('📝 Conversation context prepared, length:', conversationContext.length)

    // Try multiple Hugging Face models with fallbacks
    const modelOptions = [
      'microsoft/DialoGPT-large',
      'facebook/blenderbot-400M-distill',
      'microsoft/DialoGPT-medium',
      'gpt2'
    ]

    let response = null
    let lastError = null

    for (const model of modelOptions) {
      try {
        console.log(`🔄 Trying model: ${model}`)
        
        const hfResponse = await fetch(
          `https://api-inference.huggingface.co/models/${model}`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('HUGGING_FACE_API')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              inputs: conversationContext,
              parameters: {
                max_new_tokens: assistant.max_tokens || 150,
                temperature: assistant.temperature || 0.8,
                do_sample: true,
                top_p: 0.9,
                return_full_text: false
              }
            }),
          }
        )

        if (!hfResponse.ok) {
          const errorText = await hfResponse.text()
          console.log(`❌ Model ${model} failed:`, hfResponse.status, errorText)
          lastError = new Error(`${model}: ${hfResponse.status} ${errorText}`)
          continue
        }

        const hfData = await hfResponse.json()
        console.log('🤖 Raw HF response:', JSON.stringify(hfData))

        // Extract response text
        let aiResponse = ''
        
        if (Array.isArray(hfData) && hfData.length > 0) {
          if (hfData[0].generated_text) {
            aiResponse = hfData[0].generated_text.trim()
          } else if (hfData[0].text) {
            aiResponse = hfData[0].text.trim()
          }
        } else if (hfData.generated_text) {
          aiResponse = hfData.generated_text.trim()
        } else if (typeof hfData === 'string') {
          aiResponse = hfData.trim()
        }

        if (aiResponse) {
          // Clean up the response - remove any context that was echoed back
          aiResponse = aiResponse.replace(/^(System:|Human:|Assistant:).*?\n/gm, '')
          aiResponse = aiResponse.replace(conversationContext, '').trim()
          
          // If response starts with the input message, remove it
          if (aiResponse.toLowerCase().startsWith(message.toLowerCase())) {
            aiResponse = aiResponse.substring(message.length).trim()
          }
          
          // Remove any remaining prefixes
          aiResponse = aiResponse.replace(/^(Assistant:|AI:|Bot:)\s*/i, '').trim()
          
          if (aiResponse.length > 0) {
            console.log('✅ Successfully got response from', model)
            response = aiResponse
            break
          }
        }
        
        lastError = new Error(`${model}: Empty or invalid response`)
        
      } catch (error) {
        console.log(`❌ Error with model ${model}:`, error.message)
        lastError = error
        continue
      }
    }

    if (!response) {
      // Fallback response if all models fail
      console.log('⚠️ All models failed, using fallback response')
      response = "I'm having trouble processing your request right now. Could you please try rephrasing your question?"
    }

    console.log('✅ Final AI response:', response)

    return new Response(
      JSON.stringify({
        success: true,
        response: response,
        assistant: {
          id: assistant.id,
          name: assistant.name,
          voice_id: assistant.voice_id
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Hugging Face Chat error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
