
import React from 'react';

export const Calls = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Call History</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 text-center text-gray-500">
          No calls have been made yet. Start a campaign to begin making calls.
        </div>
      </div>
    </div>
  );
};
