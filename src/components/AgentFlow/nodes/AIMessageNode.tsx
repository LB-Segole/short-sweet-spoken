
import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';

interface AIMessageNodeProps {
  data: {
    label: string;
    config: {
      system_prompt: string;
      temperature: number;
      max_tokens: number;
      model: string;
    };
  };
}

export const AIMessageNode: React.FC<AIMessageNodeProps> = ({ data }) => {
  return (
    <Card className="min-w-[200px] bg-blue-50 border-blue-200">
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 bg-blue-500"
      />
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
          <MessageSquare className="w-4 h-4" />
          AI Message
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-gray-600 truncate">
          {data.config.system_prompt || 'AI response'}
        </p>
        <div className="text-xs text-gray-500 mt-1">
          Model: {data.config.model}
        </div>
      </CardContent>
      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 bg-blue-500"
      />
    </Card>
  );
};
