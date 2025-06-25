
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MessageSquare, 
  GitBranch, 
  Zap, 
  Phone, 
  Square, 
  Variable,
  Play
} from 'lucide-react';

const nodeItems = [
  { type: 'start', label: 'Start', icon: Play, color: 'bg-green-100 text-green-700' },
  { type: 'ai_message', label: 'AI Message', icon: MessageSquare, color: 'bg-blue-100 text-blue-700' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'bg-yellow-100 text-yellow-700' },
  { type: 'integration', label: 'Integration', icon: Zap, color: 'bg-purple-100 text-purple-700' },
  { type: 'transfer', label: 'Transfer', icon: Phone, color: 'bg-orange-100 text-orange-700' },
  { type: 'variable', label: 'Variable', icon: Variable, color: 'bg-indigo-100 text-indigo-700' },
  { type: 'end', label: 'End', icon: Square, color: 'bg-red-100 text-red-700' },
];

export const NodeToolbar: React.FC = () => {
  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <Card className="w-64 h-full overflow-y-auto">
      <CardHeader>
        <CardTitle className="text-lg">Node Types</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {nodeItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.type}
              draggable
              onDragStart={(event) => onDragStart(event, item.type)}
              className={`p-3 rounded-lg cursor-move transition-all hover:shadow-md ${item.color} border-2 border-dashed border-gray-300 hover:border-gray-400`}
            >
              <div className="flex items-center gap-2">
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </div>
            </div>
          );
        })}
        
        <div className="mt-6 pt-4 border-t">
          <h4 className="font-medium text-sm text-gray-600 mb-2">Instructions</h4>
          <p className="text-xs text-gray-500">
            Drag and drop nodes onto the canvas to build your agent flow. Connect nodes by dragging from the handles.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
