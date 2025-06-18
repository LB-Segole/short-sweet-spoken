
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export const createSuccessResponse = (message: string, callId: string, status?: string) => {
  return new Response(
    JSON.stringify({
      success: true,
      message,
      callId,
      ...(status && { status })
    }),
    { 
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      } 
    }
  );
};

export const createErrorResponse = (error: string, status: number = 500) => {
  return new Response(
    JSON.stringify({ 
      success: false, 
      error 
    }),
    { 
      status, 
      headers: { 
        ...corsHeaders,
        'Content-Type': 'application/json' 
      } 
    }
  );
};

export const createCorsResponse = () => {
  return new Response(null, { headers: corsHeaders });
};
