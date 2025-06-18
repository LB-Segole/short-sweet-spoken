import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Phone, Clock, DollarSign } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';
import { formatDistanceToNow } from 'date-fns';

export const RecentActivity = () => {
  const { recentCalls, isLoading } = useDashboardData();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest call activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="h-10 w-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'transferred': return 'bg-blue-500';
      case 'in-progress': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'failed': return 'destructive';
      case 'transferred': return 'secondary';
      case 'in-progress': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest call activity from your First Choice LLC campaigns</CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-4">
            {recentCalls && recentCalls.length > 0 ? (
              recentCalls.map((call: any) => (
                <div key={call.id} className="flex items-center space-x-4 p-3 rounded-lg border bg-white">
                  <div className="relative">
                    <div className={`h-3 w-3 rounded-full ${getStatusColor(call.status)}`}></div>
                    <Phone className="h-4 w-4 text-muted-foreground mt-1" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      Call to {call.contacts?.name || call.phone_number || 'Unknown'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {call.phone_number || call.contacts?.phone} • {call.campaigns?.name || 'No Campaign'}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant={getStatusVariant(call.status)} className="text-xs">
                        {call.status}
                      </Badge>
                      {call.duration && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                        </div>
                      )}
                      {call.call_cost && (
                        <div className="flex items-center text-xs text-muted-foreground">
                          <DollarSign className="h-3 w-3 mr-1" />
                          ${call.call_cost.toFixed(2)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <Phone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No recent call activity</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Start a campaign to see call activity here
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
