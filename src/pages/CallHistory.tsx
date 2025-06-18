import React from 'react';
import RealCallHistoryTable from '@/components/CallHistory/RealCallHistoryTable';

const CallHistory = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Call History</h1>
        <p className="text-gray-600">View your recent calls and their performance metrics.</p>
      </div>

      <RealCallHistoryTable />
    </div>
  );
};

export default CallHistory;
