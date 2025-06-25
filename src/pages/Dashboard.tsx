
import { DashboardStats } from '@/components/Dashboard/DashboardStats';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">
          Welcome back{user?.name ? `, ${user.name}` : ''}! Overview of your voice AI platform activity
        </p>
      </div>
      
      <div className="space-y-8">
        <DashboardStats />
        
        {/* Additional welcome content */}
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">Welcome to your Voice AI Platform dashboard!</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Create voice agents to handle calls</li>
                <li>• Set up campaigns for outbound calling</li>
                <li>• Monitor call history and performance</li>
                <li>• Explore the agent marketplace</li>
              </ul>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <button className="w-full p-2 text-left text-sm bg-blue-50 hover:bg-blue-100 rounded border">
                  Create New Voice Agent
                </button>
                <button className="w-full p-2 text-left text-sm bg-green-50 hover:bg-green-100 rounded border">
                  Start New Campaign
                </button>
                <button className="w-full p-2 text-left text-sm bg-purple-50 hover:bg-purple-100 rounded border">
                  Browse Marketplace
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
