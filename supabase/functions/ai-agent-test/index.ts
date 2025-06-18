import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { callId, message } = await req.json()

    // Simple ping test for AI agent
    if (message === 'ping') {
      return new Response(
        JSON.stringify({
          success: true,
          response: 'pong',
          callId: callId,
          timestamp: new Date().toISOString()
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Test OpenAI connection
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are testing the AI agent connection. Respond with "AI agent test successful".'
          },
          {
            role: 'user',
            content: message
          }
        ],
        max_tokens: 50
      })
    })

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI test failed: ${openaiResponse.statusText}`)
    }

    const aiResponse = await openaiResponse.json()
    const responseText = aiResponse.choices[0]?.message?.content || 'Test response'

    return new Response(
      JSON.stringify({
        success: true,
        response: responseText,
        callId: callId,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})