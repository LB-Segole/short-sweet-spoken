
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const provider = url.searchParams.get('provider');

    switch (req.method) {
      case 'GET':
        if (provider) {
          // Get specific provider key (masked)
          const { data: key, error } = await supabase
            .from('provider_keys')
            .select('provider, created_at')
            .eq('user_id', user.id)
            .eq('provider', provider)
            .single();

          if (error && error.code !== 'PGRST116') throw error;

          return new Response(JSON.stringify({
            provider,
            configured: !!key,
            created_at: key?.created_at
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          // Get all provider keys (masked)
          const { data: keys, error } = await supabase
            .from('provider_keys')
            .select('provider, created_at')
            .eq('user_id', user.id);

          if (error) throw error;

          return new Response(JSON.stringify(keys), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

      case 'POST':
        const { provider: newProvider, api_key } = await req.json();
        
        if (!newProvider || !api_key) {
          throw new Error('Provider and API key are required');
        }

        // Upsert the provider key
        const { data: newKey, error: upsertError } = await supabase
          .from('provider_keys')
          .upsert({
            user_id: user.id,
            provider: newProvider,
            api_key: api_key
          }, {
            onConflict: 'user_id,provider'
          })
          .select('provider, created_at')
          .single();

        if (upsertError) throw upsertError;

        return new Response(JSON.stringify(newKey), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'DELETE':
        if (!provider) {
          throw new Error('Provider parameter is required');
        }

        const { error: deleteError } = await supabase
          .from('provider_keys')
          .delete()
          .eq('user_id', user.id)
          .eq('provider', provider);

        if (deleteError) throw deleteError;

        return new Response(JSON.stringify({ message: 'Provider key deleted' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response('Method not allowed', { 
          status: 405,
          headers: corsHeaders
        });
    }
  } catch (error) {
    console.error('Provider keys API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
