
import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone } from 'lucide-react';

interface TransferNodeProps {
  data: {
    label: string;
    config: {
      transfer_type: 'human' | 'phone' | 'email';
      target: string;
      message: string;
    };
  };
}

export const TransferNode: React.FC<TransferNodeProps> = ({ data }) => {
  return (
    <Card className="min-w-[200px] bg-orange-50 border-orange-200">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-orange-500"
      />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-orange-700">
          <Phone className="w-4 h-4" />
          Transfer
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-gray-600 truncate">
          To: {data.config.transfer_type}
        </p>
        <div className="text-xs text-gray-500 mt-1 truncate">
          {data.config.target || 'No target set'}
        </div>
      </CardContent>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-orange-500"
      />
    </Card>
  );
};
