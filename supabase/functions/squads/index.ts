
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
    const pathSegments = url.pathname.split('/');
    const squadId = pathSegments[pathSegments.length - 1];

    switch (req.method) {
      case 'GET':
        if (squadId && squadId !== 'squads') {
          // Get single squad with assistants
          const { data: squad, error } = await supabase
            .from('squads')
            .select(`
              *,
              assistants:configuration
            `)
            .eq('id', squadId)
            .eq('user_id', user.id)
            .single();

          if (error) throw error;

          return new Response(JSON.stringify(squad), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          // Get all squads for user
          const { data: squads, error } = await supabase
            .from('squads')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;

          return new Response(JSON.stringify(squads), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

      case 'POST':
        const createData = await req.json();
        
        // Validate configuration
        if (!createData.configuration || !Array.isArray(createData.configuration.assistants)) {
          throw new Error('Invalid squad configuration');
        }

        const { data: newSquad, error: createError } = await supabase
          .from('squads')
          .insert({
            user_id: user.id,
            name: createData.name,
            configuration: createData.configuration
          })
          .select()
          .single();

        if (createError) throw createError;

        return new Response(JSON.stringify(newSquad), {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'PUT':
        const updateData = await req.json();
        const { data: updatedSquad, error: updateError } = await supabase
          .from('squads')
          .update({
            name: updateData.name,
            configuration: updateData.configuration
          })
          .eq('id', squadId)
          .eq('user_id', user.id)
          .select()
          .single();

        if (updateError) throw updateError;

        return new Response(JSON.stringify(updatedSquad), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case 'DELETE':
        const { error: deleteError } = await supabase
          .from('squads')
          .delete()
          .eq('id', squadId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        return new Response(JSON.stringify({ message: 'Squad deleted' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response('Method not allowed', { 
          status: 405,
          headers: corsHeaders
        });
    }
  } catch (error) {
    console.error('Squads API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
