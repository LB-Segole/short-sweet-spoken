
import RealCallHistoryTable from '@/components/CallHistory/RealCallHistoryTable';

const CallHistory = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Call History</h1>
        <p className="text-gray-600">View and manage your recent voice AI calls</p>
      </div>
      
      <RealCallHistoryTable />
    </div>
  );
};

export default CallHistory;
