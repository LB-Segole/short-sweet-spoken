
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('AI chat request received');
    
    let requestData;
    try {
      requestData = await req.json();
      console.log('Successfully parsed request data:', requestData);
    } catch (parseError) {
      console.error('JSON parsing error:', parseError);
      throw new Error(`Failed to parse request JSON: ${parseError.message}`);
    }

    const { message, system_prompt, model = 'gpt-4o', temperature = 0.8, max_tokens = 500 } = requestData;
    
    if (!message) {
      throw new Error('Message is required');
    }
    
    if (!system_prompt) {
      throw new Error('System prompt is required');
    }

    console.log('Processing AI chat with model:', model);
    
    // Validate OpenAI API key
    const openaiApiKey = Deno.env.get('OpenAi_API');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    // Call OpenAI's Chat API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: system_prompt },
          { role: 'user', content: message }
        ],
        temperature: temperature,
        max_tokens: max_tokens,
      }),
    });
    
    console.log('OpenAI response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${errorText}`);
    }
    
    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '';
    
    console.log('AI response generated successfully');
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        response: aiResponse,
        usage: data.usage
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in AI chat:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to generate AI response' 
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
