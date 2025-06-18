
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Clock, TrendingUp, Users } from 'lucide-react';
import { useDashboardData } from '@/hooks/useDashboardData';

export const DashboardStats = () => {
  const { campaignStats, callStats, isLoading } = useDashboardData();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: "Total Calls",
      value: callStats?.totalCalls || 0,
      description: `${callStats?.todaysCalls || 0} calls today`,
      icon: Phone,
      trend: callStats?.successRate ? `${callStats.successRate}% success rate` : null
    },
    {
      title: "Active Campaigns",
      value: campaignStats?.activeCampaigns || 0,
      description: `${campaignStats?.totalCampaigns || 0} total campaigns`,
      icon: Users,
      trend: null
    },
    {
      title: "Minutes Used",
      value: callStats?.totalMinutes || 0,
      description: "Total call duration",
      icon: Clock,
      trend: null
    },
    {
      title: "Success Rate",
      value: `${callStats?.successRate || 0}%`,
      description: `${callStats?.successfulCalls || 0} successful calls`,
      icon: TrendingUp,
      trend: callStats?.successRate && callStats.successRate > 70 ? "Excellent" : "Good"
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {stat.description}
            </p>
            {stat.trend && (
              <Badge variant="secondary" className="mt-2">
                {stat.trend}
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
