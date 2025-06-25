
import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap } from 'lucide-react';

interface IntegrationNodeProps {
  data: {
    label: string;
    config: {
      integration_type: string;
      endpoint: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      headers?: Record<string, string>;
      body?: any;
    };
  };
}

export const IntegrationNode: React.FC<IntegrationNodeProps> = ({ data }) => {
  return (
    <Card className="min-w-[200px] bg-purple-50 border-purple-200">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-purple-500"
      />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-purple-700">
          <Zap className="w-4 h-4" />
          Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-gray-600 truncate">
          {data.config.integration_type || 'API Call'}
        </p>
        <div className="text-xs text-gray-500 mt-1">
          {data.config.method} {data.config.endpoint || 'No endpoint'}
        </div>
      </CardContent>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-purple-500"
      />
    </Card>
  );
};
