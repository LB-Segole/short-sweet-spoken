
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

  try {
    const { name, email, subject, message, urgency } = await req.json();

    // Validate required fields
    if (!name || !email || !subject || !message) {
      throw new Error('Missing required fields');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''
    );

    // Get authenticated user if available
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      try {
        const { data: { user } } = await supabase.auth.getUser(
          authHeader.replace('Bearer ', '')
        );
        userId = user?.id;
      } catch (error) {
        console.log('No authenticated user for support ticket');
      }
    }

    // Store support ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .insert({
        user_id: userId,
        name,
        email,
        subject,
        message,
        urgency: urgency || 'normal',
        status: 'open',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (ticketError) {
      console.error('Error creating support ticket:', ticketError);
      throw new Error('Failed to create support ticket');
    }

    // Send notification email (you can integrate with SendGrid, Resend, etc.)
    console.log('Support ticket created:', ticket.id);
    console.log('Notification should be sent to support team');

    // For now, we'll just log the ticket details
    console.log('Support Ticket Details:', {
      id: ticket.id,
      name,
      email,
      subject,
      urgency,
      message: message.substring(0, 100) + '...'
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        ticketId: ticket.id,
        message: 'Support ticket created successfully'
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    console.error('Error in support-ticket function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to create support ticket' 
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
