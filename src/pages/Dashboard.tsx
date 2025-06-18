
import { DashboardStats } from '@/components/Dashboard/DashboardStats';

const Dashboard = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of your voice AI platform activity</p>
      </div>
      
      <div className="space-y-8">
        <DashboardStats />
      </div>
    </div>
  );
};

export default Dashboard;
