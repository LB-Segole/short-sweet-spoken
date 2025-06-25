
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'unknown';
  timestamp?: string;
  service?: string;
  version?: string;
  responseTime?: number;
  error?: string;
}

export const HealthCheck: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState<HealthStatus>({ status: 'unknown' });
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = async () => {
    setIsChecking(true);
    const startTime = Date.now();
    
    try {
      console.log('🏥 Starting health check...');
      
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('No authentication session found');
      }

      const response = await fetch(
        `https://csixccpoxpnwowbgkoyw.supabase.co/functions/v1/deepgram-voice-agent/health`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      
      const responseTime = Date.now() - startTime;
      
      if (response.ok) {
        const data = await response.json();
        setHealthStatus({
          status: 'healthy',
          timestamp: data.timestamp,
          service: data.service,
          version: data.version,
          responseTime
        });
        console.log('✅ Health check passed:', data);
      } else {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Health check failed:', error);
      setHealthStatus({
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      });
    } finally {
      setIsChecking(false);
      setLastChecked(new Date());
    }
  };

  useEffect(() => {
    // Check health on component mount
    checkHealth();
  }, []);

  const getStatusIcon = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'unhealthy':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusBadge = () => {
    switch (healthStatus.status) {
      case 'healthy':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Healthy</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          {getStatusIcon()}
          Voice Agent Service Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Status:</span>
          {getStatusBadge()}
        </div>
        
        {healthStatus.responseTime && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Response Time:</span>
            <span className="text-sm font-mono">{healthStatus.responseTime}ms</span>
          </div>
        )}
        
        {healthStatus.service && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Service:</span>
            <span className="text-sm font-mono">{healthStatus.service}</span>
          </div>
        )}
        
        {healthStatus.version && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Version:</span>
            <span className="text-sm font-mono">{healthStatus.version}</span>
          </div>
        )}
        
        {lastChecked && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Checked:</span>
            <span className="text-sm">{lastChecked.toLocaleTimeString()}</span>
          </div>
        )}
        
        {healthStatus.error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <strong>Error:</strong> {healthStatus.error}
          </div>
        )}
        
        <Button 
          onClick={checkHealth} 
          disabled={isChecking}
          variant="outline" 
          size="sm" 
          className="w-full"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Check Now'}
        </Button>
      </CardContent>
    </Card>
  );
};
