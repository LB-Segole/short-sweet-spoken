
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Configuration, OpenAIApi } from "https://esm.sh/openai@3.2.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, campaignContext, previousMessages } = await req.json();
    
    if (!transcript) {
      throw new Error('Transcript is required');
    }
    
    // Initialize OpenAI client
    const openai = new OpenAIApi(
      new Configuration({
        apiKey: Deno.env.get('OPENAI_API_KEY') || '',
      })
    );
    
    // Build conversation history
    const messages = [
      {
        role: "system", 
        content: `You are an AI voice calling agent having a phone conversation. ${campaignContext || 'Be helpful and professional.'}`
      }
    ];
    
    // Add previous messages if available
    if (previousMessages && Array.isArray(previousMessages)) {
      messages.push(...previousMessages);
    }
    
    // Add the latest transcript as user input
    messages.push({ role: "user", content: transcript });
    
    // Get response from OpenAI
    const completion = await openai.createChatCompletion({
      model: "gpt-4o",
      messages,
      max_tokens: 300,
      temperature: 0.7,
    });
    
    const aiResponse = completion.data.choices[0]?.message?.content || '';
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        response: aiResponse,
        usage: completion.data.usage
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error processing with OpenAI:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to process with OpenAI' 
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
