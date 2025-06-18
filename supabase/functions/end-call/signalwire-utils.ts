
export interface SignalWireConfig {
  projectId: string;
  apiToken: string;
  spaceUrl: string;
}

export const getSignalWireConfig = (): SignalWireConfig => {
  const projectId = Deno.env.get('Project_ID');
  const apiToken = Deno.env.get('Token');
  const spaceUrl = Deno.env.get('Space_URL');

  console.log('SignalWire config check:', { 
    projectId: !!projectId, 
    apiToken: !!apiToken, 
    spaceUrl: !!spaceUrl 
  });

  if (!projectId || !apiToken || !spaceUrl) {
    throw new Error('SignalWire credentials not configured');
  }

  return { projectId, apiToken, spaceUrl };
};

export const terminateCall = async (callId: string, config: SignalWireConfig): Promise<any> => {
  const signalwireUrl = `https://${config.spaceUrl}/api/laml/2010-04-01/Accounts/${config.projectId}/Calls/${callId}.json`;
  
  console.log('Attempting to terminate call at URL:', signalwireUrl);

  const response = await fetch(signalwireUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${config.projectId}:${config.apiToken}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      Status: 'completed'
    }).toString()
  });

  console.log('SignalWire end call response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('SignalWire API error:', errorText);

    // Treat 422 or 404 as call already completed/ended
    if (response.status === 422 || response.status === 404) {
      console.log('Call already completed on SignalWire side (422/404).');
      return { alreadyCompleted: true };
    }

    throw new Error(`SignalWire API error: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('Call terminated successfully:', result.sid);
  return result;
};
