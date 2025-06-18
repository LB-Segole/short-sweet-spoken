import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Clock, User, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface CallRecord {
  id: string;
  created_at: string;
  phone_number: string;
  status: string;
  duration: number | null;
  signalwire_call_id: string | null;
  assistant_id: string | null;
  user_id: string;
}

const RealCallHistoryTable = () => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCallHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('calls')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) {
          setError(error.message);
        } else {
          setCalls(data || []);
        }
      } catch (err: any) {
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchCallHistory();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDuration = (duration: number | null) => {
    if (!duration) return 'N/A';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}m ${seconds}s`;
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-500" />
          Recent Call History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading call history...</div>
        ) : error ? (
          <div className="text-center py-4 text-red-500">Error: {error}</div>
        ) : calls.length === 0 ? (
          <div className="text-center py-4">No call history available.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date/Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {calls.map((call) => (
                  <tr key={call.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(call.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {call.phone_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Badge
                        variant={
                          call.status === 'completed'
                            ? 'success'
                            : call.status === 'failed'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {call.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDuration(call.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
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
