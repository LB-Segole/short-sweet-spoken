
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { DashboardStats } from '@/components/Dashboard/DashboardStats';
import { RecentActivity } from '@/components/Dashboard/RecentActivity';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { Phone, Users, Settings, TrendingUp, CreditCard } from 'lucide-react';
import { useSubscription } from '@/hooks/useSubscription';
import { Badge } from '@/components/ui/badge';

const Dashboard = () => {
  const { user } = useAuth();
  const { subscription, getDaysRemaining, isTrialActive, startFreeTrial } = useSubscription();

  const getTrialStatusColor = () => {
    const daysLeft = getDaysRemaining();
    if (daysLeft > 7) return 'bg-green-100 text-green-800';
    if (daysLeft > 3) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Welcome back, {user?.name || user?.email?.split('@')[0] || 'User'}!
        </h1>
        <p className="text-gray-500">
          Manage your voice calling campaigns and track performance from your First Choice LLC dashboard
        </p>
      </div>

      {/* Stats Overview */}
      <DashboardStats />

      {/* Main Content Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>

        {/* Quick Actions */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks and shortcuts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/campaigns">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="mr-2 h-4 w-4" />
                  Manage Campaigns
                </Button>
              </Link>
              <Link to="/call-center">
                <Button className="w-full justify-start" variant="outline">
                  <Phone className="mr-2 h-4 w-4" />
                  Start New Call
                </Button>
              </Link>
              <Link to="/call-history">
                <Button className="w-full justify-start" variant="outline">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Call History
                </Button>
              </Link>
              <Link to="/settings">
                <Button className="w-full justify-start" variant="outline">
                  <Settings className="mr-2 h-4 w-4" />
                  Account Settings
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Subscription Status */}
          <Card>
            <CardHeader>
              <CardTitle>First Choice LLC Subscription</CardTitle>
              <CardDescription>Your current subscription status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge className={getTrialStatusColor()}>
                    {subscription?.status === 'trial' ? 'Free Trial' : 
                     subscription?.status === 'active' ? 'Active' : 
                     subscription?.status === 'canceled' ? 'Canceled' : 'Inactive'}
                  </Badge>
                </div>
                
                {isTrialActive && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Days Remaining</span>
                      <span className="text-sm font-bold">{getDaysRemaining()} days</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all" 
                        style={{ width: `${Math.max(10, (getDaysRemaining() / 30) * 100)}%` }}
                      ></div>
                    </div>
                  </>
                )}
                
                {subscription?.trial_end && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Trial Ends</span>
                    <span className="text-sm">
                      {new Date(subscription.trial_end).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {subscription?.status === 'trial' ? (
                  <Link to="/pricing">
                    <Button className="w-full" size="sm">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Upgrade Plan
                    </Button>
                  </Link>
                ) : !subscription ? (
                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={() => startFreeTrial.mutate()}
                    disabled={startFreeTrial.isPending}
                  >
                    {startFreeTrial.isPending ? 'Starting...' : 'Start Free Trial'}
                  </Button>
                ) : (
                  <Link to="/settings">
                    <Button className="w-full" variant="outline" size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Manage Subscription
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
