
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus, Play, Edit, Trash2, User } from 'lucide-react';
import { Agent } from '../types/agent';
import { AgentForm } from './AgentForm';
import { useAgentStorage } from './useAgentStorage';

interface AgentManagerProps {
  onStartCall: (agent: Agent) => void;
  isCallActive: boolean;
}

export const AgentManager: React.FC<AgentManagerProps> = ({ onStartCall, isCallActive }) => {
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const { agents, createAgent, updateAgent, deleteAgent } = useAgentStorage();

  const handleCreateAgent = async (agentData: any) => {
    await createAgent(agentData);
    setShowForm(false);
  };

  const handleUpdateAgent = async (agentData: any) => {
    if (editingAgent) {
      await updateAgent(editingAgent.id, agentData);
      setEditingAgent(null);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (confirm('Are you sure you want to delete this agent?')) {
      await deleteAgent(agentId);
    }
  };

  const getPersonalityColor = (personality: Agent['personality']) => {
    switch (personality) {
      case 'professional': return 'bg-blue-100 text-blue-800';
      case 'friendly': return 'bg-green-100 text-green-800';
      case 'casual': return 'bg-yellow-100 text-yellow-800';
      case 'assertive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Voice Agents</h2>
          <p className="text-gray-600">Create and manage your DeepGram-powered voice agents</p>
        </div>
        <Button onClick={() => setShowForm(true)} disabled={isCallActive}>
          <Plus className="h-4 w-4 mr-2" />
          Create Agent
        </Button>
      </div>

      {/* Agent Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((agent) => (
          <Card key={agent.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <User className="h-5 w-5 text-gray-500" />
                  <CardTitle className="text-lg">{agent.name}</CardTitle>
                </div>
                <Badge className={getPersonalityColor(agent.personality)}>
                  {agent.personality}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {agent.description && (
                <p className="text-sm text-gray-600 line-clamp-2">{agent.description}</p>
              )}
              
              <div className="space-y-2">
                <div className="text-xs text-gray-500">First Message:</div>
                <p className="text-sm bg-gray-50 p-2 rounded line-clamp-3">{agent.firstMessage}</p>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-500">System Prompt:</div>
                <p className="text-sm bg-gray-50 p-2 rounded line-clamp-2">{agent.systemPrompt}</p>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingAgent(agent)}
                    disabled={isCallActive}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteAgent(agent.id)}
                    disabled={isCallActive}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  onClick={() => onStartCall(agent)}
                  disabled={isCallActive}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Start Call
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {agents.length === 0 && (
        <Card className="text-center py-8">
          <CardContent>
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No agents created yet</h3>
            <p className="text-gray-600 mb-4">Create your first AI voice agent to get started</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Agent
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Agent Form Modal */}
      {(showForm || editingAgent) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <AgentForm
              initialData={editingAgent}
              onSubmit={editingAgent ? handleUpdateAgent : handleCreateAgent}
              onCancel={() => {
                setShowForm(false);
                setEditingAgent(null);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
