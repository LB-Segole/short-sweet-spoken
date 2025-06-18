
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
    const callId = url.searchParams.get('callId');
    const timeframe = url.searchParams.get('timeframe') || '7d';

    switch (req.method) {
      case 'GET':
        if (callId) {
          // Get specific call analytics
          const { data: call, error } = await supabase
            .from('calls')
            .select(`
              *,
              conversation_logs (*)
            `)
            .eq('id', callId)
            .eq('user_id', user.id)
            .single();

          if (error) throw error;

          return new Response(JSON.stringify(call), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        } else {
          // Get analytics summary
          const endDate = new Date();
          const startDate = new Date();
          
          switch (timeframe) {
            case '1d':
              startDate.setDate(endDate.getDate() - 1);
              break;
            case '7d':
              startDate.setDate(endDate.getDate() - 7);
              break;
            case '30d':
              startDate.setDate(endDate.getDate() - 30);
              break;
            default:
              startDate.setDate(endDate.getDate() - 7);
          }

          const { data: calls, error } = await supabase
            .from('calls')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', startDate.toISOString())
            .lte('created_at', endDate.toISOString());

          if (error) throw error;

          // Calculate analytics
          const totalCalls = calls.length;
          const completedCalls = calls.filter(call => call.status === 'completed').length;
          const transferredCalls = calls.filter(call => call.status === 'transferred').length;
          const averageDuration = calls.reduce((sum, call) => sum + (call.duration || 0), 0) / totalCalls || 0;
          const averageSuccessScore = calls.reduce((sum, call) => sum + (call.success_score || 0), 0) / totalCalls || 0;

          const analytics = {
            totalCalls,
            completedCalls,
            transferredCalls,
            successRate: completedCalls / totalCalls || 0,
            transferRate: transferredCalls / totalCalls || 0,
            averageDuration: Math.round(averageDuration),
            averageSuccessScore: Math.round(averageSuccessScore * 10) / 10,
            calls: calls.slice(0, 10) // Latest 10 calls
          };

          return new Response(JSON.stringify(analytics), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

      default:
        return new Response('Method not allowed', { 
          status: 405,
          headers: corsHeaders
        });
    }
  } catch (error) {
    console.error('Analytics API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
