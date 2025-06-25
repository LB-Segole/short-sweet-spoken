import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useVoiceAgents } from '@/hooks/useVoiceAgents';
import { VoiceAgentForm } from '@/components/VoiceAgents/VoiceAgentForm';
import { VoiceAgentCard } from '@/components/VoiceAgents/VoiceAgentCard';
import { VoiceTestInterface } from '@/components/VoiceAgents/VoiceTestInterface';
import { VoiceAgent, VoiceAgentFormData } from '@/types/voiceAgent';
import { BrowserChatTest } from '@/components/VoiceAgents/BrowserChatTest';

const VoiceAgents = () => {
  const navigate = useNavigate();
  const { agents, isLoading, createAgent, updateAgent, deleteAgent, toggleAgentStatus } = useVoiceAgents();
  const [showForm, setShowForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<VoiceAgent | undefined>(undefined);
  const [testingAgent, setTestingAgent] = useState<VoiceAgent | null>(null);
  const [chattingAgent, setChattingAgent] = useState<VoiceAgent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreateAgent = async (formData: VoiceAgentFormData) => {
    setIsSubmitting(true);
    try {
      const newAgent = await createAgent(formData);
      if (newAgent) {
        setShowForm(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateAgent = async (formData: VoiceAgentFormData) => {
    if (!editingAgent) return;
    
    setIsSubmitting(true);
    try {
      const updatedAgent = await updateAgent(editingAgent.id, formData);
      if (updatedAgent) {
        setEditingAgent(undefined);
        setShowForm(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (agent: VoiceAgent) => {
    setEditingAgent(agent);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this voice agent?')) {
      await deleteAgent(id);
    }
  };

  const handleStartTest = (agent: VoiceAgent) => {
    setTestingAgent(agent);
  };

  const handleStartChat = (agent: VoiceAgent) => {
    setChattingAgent(agent);
  };

  const handleMakeCall = (agent: VoiceAgent) => {
    // TODO: Implement outbound call functionality
    console.log('Making call with agent:', agent.name);
    alert('Outbound call functionality coming soon!');
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAgent(undefined);
  };

  const handleCreateFlow = () => {
    navigate('/agent-flow-editor/new');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading voice agents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/dashboard')}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold text-gray-900">Voice AI Agents</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button onClick={handleCreateFlow} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Visual Flow Builder
              </Button>
              <Button onClick={() => setShowForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create Voice Agent
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Create/Edit Form */}
        {showForm && (
          <div className="mb-8">
            <VoiceAgentForm
              agent={editingAgent}
              onSubmit={editingAgent ? handleUpdateAgent : handleCreateAgent}
              onCancel={handleCancel}
              isLoading={isSubmitting}
            />
          </div>
        )}

        {/* Voice Agents Grid */}
        {!showForm && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <VoiceAgentCard
                key={agent.id}
                agent={agent}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggleStatus={toggleAgentStatus}
                onStartTest={handleStartTest}
                onStartChat={handleStartChat}
                onMakeCall={handleMakeCall}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!showForm && agents.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No voice agents created yet</p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Voice Agent
            </Button>
          </div>
        )}
      </div>

      {/* Voice Test Interface */}
      {testingAgent && (
        <VoiceTestInterface
          agent={testingAgent}
          onClose={() => setTestingAgent(null)}
        />
      )}

      {/* Browser Chat Test Interface */}
      {chattingAgent && (
        <BrowserChatTest
          agent={chattingAgent}
          onClose={() => setChattingAgent(null)}
        />
      )}
    </div>
  );
};

export default VoiceAgents;
