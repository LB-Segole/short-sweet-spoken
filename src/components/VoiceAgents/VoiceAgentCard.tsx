
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { VoiceAgent } from '@/types/voiceAgent';
import { Edit, Trash2, Phone, Play, Pause } from 'lucide-react';

interface VoiceAgentCardProps {
  agent: VoiceAgent;
  onEdit: (agent: VoiceAgent) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  onStartTest: (agent: VoiceAgent) => void;
  onMakeCall: (agent: VoiceAgent) => void;
}

export const VoiceAgentCard: React.FC<VoiceAgentCardProps> = ({
  agent,
  onEdit,
  onDelete,
  onToggleStatus,
  onStartTest,
  onMakeCall,
}) => {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{agent.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={agent.is_active ? 'default' : 'secondary'}>
                {agent.is_active ? 'Active' : 'Inactive'}
              </Badge>
              <Badge variant="outline">{agent.voice_model}</Badge>
            </div>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(agent)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(agent.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {agent.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {agent.description}
          </p>
        )}
        
        <div className="text-sm text-gray-500">
          <p className="line-clamp-3">{agent.system_prompt}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onToggleStatus(agent.id, !agent.is_active)}
          >
            {agent.is_active ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
            {agent.is_active ? 'Deactivate' : 'Activate'}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onStartTest(agent)}
            disabled={!agent.is_active}
          >
            <Play className="h-4 w-4 mr-1" />
            Test Voice
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMakeCall(agent)}
            disabled={!agent.is_active}
          >
            <Phone className="h-4 w-4 mr-1" />
            Make Call
          </Button>
        </div>
        
        <div className="text-xs text-gray-400">
          Created: {new Date(agent.created_at).toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
};
