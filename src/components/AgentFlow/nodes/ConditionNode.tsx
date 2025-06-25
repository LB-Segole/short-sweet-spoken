
import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { GitBranch } from 'lucide-react';

interface ConditionNodeProps {
  data: {
    label: string;
    config: {
      condition_type: 'keyword' | 'intent' | 'variable';
      condition_value: string;
      true_path?: string;
      false_path?: string;
    };
  };
}

export const ConditionNode: React.FC<ConditionNodeProps> = ({ data }) => {
  return (
    <Card className="min-w-[200px] bg-yellow-50 border-yellow-200">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-yellow-500"
      />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-yellow-700">
          <GitBranch className="w-4 h-4" />
          Condition
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-gray-600 truncate">
          {data.config.condition_type}: {data.config.condition_value || 'not set'}
        </p>
      </CardContent>
      <Handle
        type="source"
        position={Position.Right}
        id="true"
        style={{ top: '60%' }}
        className="w-3 h-3 bg-green-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="false"
        style={{ top: '80%' }}
        className="w-3 h-3 bg-red-500"
      />
    </Card>
  );
};
