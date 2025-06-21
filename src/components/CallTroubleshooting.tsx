
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Phone, Shield, Clock } from 'lucide-react';

interface CallTroubleshootingProps {
  lastCallStatus?: string;
  sipResultCode?: string;
}

const CallTroubleshooting: React.FC<CallTroubleshootingProps> = ({
  lastCallStatus,
  sipResultCode
}) => {
  const getSipCodeExplanation = (code: string) => {
    switch (code) {
      case '603':
        return {
          title: 'Call Actively Declined (SIP 603)',
          description: 'The destination phone or PBX actively rejected the call',
          causes: [
            'Do Not Disturb (DND) mode is enabled',
            'Call blocking/filtering is active',
            'Very short ring timeout configured',
            'Auto-reject settings for unknown numbers'
          ],
          solutions: [
            'Check if DND mode is disabled',
            'Verify call filtering/blocking settings',
            'Test with a different phone number',
            'Check PBX or phone system configuration'
          ]
        };
      case '486':
        return {
          title: 'Line Busy (SIP 486)',
          description: 'The destination is currently busy on another call',
          causes: ['Active call in progress', 'Single-line phone system'],
          solutions: ['Try calling again later', 'Use a multi-line system']
        };
      case '480':
        return {
          title: 'Temporarily Unavailable (SIP 480)',
          description: 'The destination is not available right now',
          causes: ['Phone is offline', 'Network issues', 'Registration problems'],
          solutions: ['Check network connectivity', 'Verify phone registration']
        };
      default:
        return null;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'default';
      case 'busy': return 'destructive';
      case 'no-answer': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const sipExplanation = sipResultCode ? getSipCodeExplanation(sipResultCode) : null;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Call Troubleshooting
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {lastCallStatus && (
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Last Call Status:</span>
            <Badge variant={getStatusBadgeVariant(lastCallStatus)}>
              {lastCallStatus.toUpperCase()}
            </Badge>
            {sipResultCode && (
              <Badge variant="outline">
                SIP {sipResultCode}
              </Badge>
            )}
          </div>
        )}

        {sipExplanation && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold">{sipExplanation.title}</h4>
                  <p className="text-sm text-gray-600">{sipExplanation.description}</p>
                </div>
                
                <div>
                  <h5 className="font-medium flex items-center gap-1">
                    <Shield className="h-4 w-4" />
                    Possible Causes:
                  </h5>
                  <ul className="text-sm text-gray-600 list-disc list-inside">
                    {sipExplanation.causes.map((cause, index) => (
                      <li key={index}>{cause}</li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h5 className="font-medium flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    Recommended Solutions:
                  </h5>
                  <ul className="text-sm text-gray-600 list-disc list-inside">
                    {sipExplanation.solutions.map((solution, index) => (
                      <li key={index}>{solution}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Common Issues
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <strong>HTTP 401 Webhooks:</strong> Fixed - webhooks now accept SignalWire callbacks properly
              </div>
              <div>
                <strong>SIP 603 Decline:</strong> Check destination phone settings for call blocking or DND
              </div>
              <div>
                <strong>Voice Access:</strong> Ensure microphone permissions are granted in browser
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <Shield className="h-4 w-4" />
                Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>• Test with known working numbers first</div>
              <div>• Check webhook logs for detailed error information</div>
              <div>• Verify SignalWire account balance and phone number status</div>
              <div>• Use E.164 format for phone numbers (+1234567890)</div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
};

export default CallTroubleshooting;
