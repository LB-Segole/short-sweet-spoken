import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, Clock, DollarSign, FileText, Play, RefreshCw } from 'lucide-react';
import { useRealCallHistory } from '@/hooks/useRealCallHistory';
import { toast } from 'sonner';

const RealCallHistoryTable = () => {
  const { calls, isLoading, refreshCallHistory } = useRealCallHistory(1, 20);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(3)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'busy':
        return 'secondary';
      case 'no-answer':
        return 'outline';
      case 'in-progress':
        return 'default';
      default:
        return 'outline';
    }
  };

  const playRecording = async (recordingUrl: string) => {
    if (recordingUrl) {
      window.open(recordingUrl, '_blank');
    } else {
      toast.error('Recording not available');
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-gray-500">Loading call history...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call History ({calls.length} calls)
          </CardTitle>
          <Button variant="outline" size="sm" onClick={refreshCallHistory}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {calls.length === 0 ? (
          <div className="text-center py-8">
            <Phone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No calls yet</h3>
            <p className="text-gray-500">
              Your call history will appear here after you make your first call.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-3 font-medium">Date & Time</th>
                  <th className="pb-3 font-medium">Phone Number</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Duration</th>
                  <th className="pb-3 font-medium">Cost</th>
                  <th className="pb-3 font-medium">Campaign</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {calls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="py-3">
                      <div className="text-sm">
                        <div className="font-medium">
                          {new Date(call.created_at).toLocaleDateString()}
                        </div>
                        <div className="text-gray-500">
                          {new Date(call.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="font-medium">{call.phone_number}</div>
                      {call.contacts?.name && (
                        <div className="text-sm text-gray-500">{call.contacts.name}</div>
                      )}
                    </td>
                    <td className="py-3">
                      <Badge variant={getStatusColor(call.status)}>
                        {call.status.replace('-', ' ')}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-gray-400" />
                        {formatDuration(call.duration)}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4 text-gray-400" />
                        {formatCost(call.call_cost)}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="text-sm">
                        {call.campaigns?.name || 'Direct Call'}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        {call.recording_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => playRecording(call.recording_url!)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {call.transcript && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toast.info('Transcript viewer coming soon')}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RealCallHistoryTable;
