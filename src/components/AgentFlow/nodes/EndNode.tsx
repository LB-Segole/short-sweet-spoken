
import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Square } from 'lucide-react';

interface EndNodeProps {
  data: {
    label: string;
    config: {
      end_message: string;
      save_conversation: boolean;
    };
  };
}

export const EndNode: React.FC<EndNodeProps> = ({ data }) => {
  return (
    <Card className="min-w-[200px] bg-red-50 border-red-200">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-red-500"
      />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-red-700">
          <Square className="w-4 h-4" />
          End
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-gray-600 truncate">
          {data.config.end_message || 'Goodbye!'}
        </p>
      </CardContent>
    </Card>
  );
};
