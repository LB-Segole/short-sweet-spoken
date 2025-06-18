
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Clock, Phone, AlertTriangle } from 'lucide-react';
import { callVerificationService, VerificationSession, VerificationCheck } from '@/services/callVerification.service';

interface CallVerificationPanelProps {
  callId?: string;
  phoneNumber?: string;
}

export const CallVerificationPanel: React.FC<CallVerificationPanelProps> = ({ callId, phoneNumber }) => {
  const [sessions, setSessions] = useState<VerificationSession[]>([]);
  const [isRunningVerification, setIsRunningVerification] = useState(false);

  useEffect(() => {
    // Poll for session updates every 2 seconds
    const interval = setInterval(() => {
      setSessions(callVerificationService.getAllSessions());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const startNewVerification = async () => {
    if (!callId || !phoneNumber) {
      console.warn('Cannot start verification: missing callId or phoneNumber');
      return;
    }

    setIsRunningVerification(true);
    try {
      const sessionId = callVerificationService.startVerification(callId, phoneNumber);
      console.log(`Started verification session: ${sessionId}`);
    } catch (error) {
      console.error('Failed to start verification:', error);
    } finally {
      setIsRunningVerification(false);
    }
  };

  const getCheckIcon = (status: VerificationCheck['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: VerificationSession['overallStatus']) => {
    switch (status) {
      case 'verified':
        return <Badge className="bg-green-500 text-white">✅ Verified</Badge>;
      case 'failed':
        return <Badge variant="destructive">❌ Failed</Badge>;
      case 'checking':
        return <Badge variant="secondary">🔍 Checking</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getCheckTitle = (type: VerificationCheck['type']) => {
    switch (type) {
      case 'signalwire_api':
        return 'SignalWire API Response';
      case 'call_status':
        return 'Call Status Progression';
      case 'webhook_response':
        return 'Webhook Events';
      case 'ring_timeout':
        return 'Ring Duration (2 min)';
      default:
        return 'Unknown Check';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="h-5 w-5" />
          Call Ring Verification
          {sessions.length > 0 && (
            <Badge variant="outline">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button 
            onClick={startNewVerification}
            disabled={isRunningVerification || !callId || !phoneNumber}
            size="sm"
          >
            {isRunningVerification ? 'Starting...' : 'Run 4 Ring Checks'}
          </Button>
          {(!callId || !phoneNumber) && (
            <div className="flex items-center gap-1 text-sm text-yellow-600">
              <AlertTriangle className="h-4 w-4" />
              Need active call to verify
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Phone className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No verification sessions running</p>
            <p className="text-sm">Start a call to run ring verification checks</p>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Card key={session.sessionId} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">
                        📞 {session.phoneNumber}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Call ID: {session.callId}
                      </p>
                    </div>
                    {getStatusBadge(session.overallStatus)}
                  </div>
                  <p className="text-xs text-gray-400">
                    Started: {new Date(session.startTime).toLocaleTimeString()}
                    {session.lastUpdate !== session.startTime && (
                      <span> • Updated: {new Date(session.lastUpdate).toLocaleTimeString()}</span>
                    )}
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {session.checks.map((check, index) => (
                      <div 
                        key={check.id}
                        className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800"
                      >
                        <div className="mt-0.5">
                          {getCheckIcon(check.status)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium text-sm">
                            Check {index + 1}: {getCheckTitle(check.type)}
                          </h5>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {check.details}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {new Date(check.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {session.overallStatus !== 'checking' && (
                    <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                      <div className="flex items-center gap-2">
                        {session.overallStatus === 'verified' ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span className="font-semibold">
                          Verification {session.overallStatus === 'verified' ? 'Completed Successfully' : 'Failed'}
                        </span>
                      </div>
                      <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                        {session.overallStatus === 'verified' 
                          ? 'Phone is confirmed to ring properly. The call system is working correctly.'
                          : 'One or more verification checks failed. Review the details above to identify issues.'
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
