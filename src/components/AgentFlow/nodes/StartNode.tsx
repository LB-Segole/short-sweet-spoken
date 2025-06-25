
import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play } from 'lucide-react';

interface StartNodeProps {
  data: {
    label: string;
    config: {
      greeting_message: string;
      voice_settings?: any;
    };
  };
}

export const StartNode: React.FC<StartNodeProps> = ({ data }) => {
  return (
    <Card className="min-w-[200px] bg-green-50 border-green-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-green-700">
          <Play className="w-4 h-4" />
          Start
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-gray-600 truncate">
          {data.config.greeting_message || 'Hello! How can I help you?'}
        </p>
      </CardContent>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-green-500"
      />
    </Card>
  );
};
