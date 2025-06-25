
import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Variable } from 'lucide-react';

interface VariableNodeProps {
  data: {
    label: string;
    config: {
      variable_name: string;
      variable_type: 'string' | 'number' | 'boolean' | 'object';
      default_value?: any;
    };
  };
}

export const VariableNode: React.FC<VariableNodeProps> = ({ data }) => {
  return (
    <Card className="min-w-[200px] bg-indigo-50 border-indigo-200">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-indigo-500"
      />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-indigo-700">
          <Variable className="w-4 h-4" />
          Variable
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-gray-600 truncate">
          {data.config.variable_name || 'unnamed'}
        </p>
        <div className="text-xs text-gray-500 mt-1">
          Type: {data.config.variable_type}
        </div>
      </CardContent>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-indigo-500"
      />
    </Card>
  );
};
