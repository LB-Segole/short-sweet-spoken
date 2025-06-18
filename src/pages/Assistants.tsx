
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAssistants } from '@/hooks/useAssistants';
import AssistantForm from '@/components/Assistants/AssistantForm';
import AssistantCard from '@/components/Assistants/AssistantCard';
import CallInterface from '@/components/Assistants/CallInterface';
import { Assistant, AssistantFormData } from '@/types/assistant';

const Assistants = () => {
  const navigate = useNavigate();
  const { assistants, isLoading, createAssistant, updateAssistant, deleteAssistant } = useAssistants();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAssistant, setEditingAssistant] = useState<Assistant | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<AssistantFormData>({
    name: '',
    system_prompt: '',
    first_message: '',
    voice_provider: 'openai',
    voice_id: 'alloy',
    model: 'gpt-4o',
    temperature: 0.8,
    max_tokens: 500
  });

  const handleCreateAssistant = async () => {
    setIsSubmitting(true);
    const success = await createAssistant(formData);
    if (success) {
      setShowCreateForm(false);
      resetForm();
    }
    setIsSubmitting(false);
  };

  const handleUpdateAssistant = async () => {
    if (!editingAssistant) return;

    setIsSubmitting(true);
    const success = await updateAssistant(editingAssistant, formData);
    if (success) {
      setEditingAssistant(null);
      setShowCreateForm(false);
      resetForm();
    }
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      system_prompt: '',
      first_message: '',
      voice_provider: 'openai',
      voice_id: 'alloy',
      model: 'gpt-4o',
      temperature: 0.8,
      max_tokens: 500
    });
  };

  const startEdit = (assistant: Assistant) => {
    setEditingAssistant(assistant);
    setFormData({
      name: assistant.name,
      system_prompt: assistant.system_prompt,
      first_message: assistant.first_message || '',
      voice_provider: assistant.voice_provider,
      voice_id: assistant.voice_id,
      model: assistant.model,
      temperature: assistant.temperature,
      max_tokens: assistant.max_tokens
    });
    setShowCreateForm(true);
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingAssistant(null);
    resetForm();
  };

  const handleSubmit = async () => {
    if (editingAssistant) {
      await handleUpdateAssistant();
    } else {
      await handleCreateAssistant();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading AI agents...</div>
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
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create AI Agent
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Create/Edit Form */}
        {showCreateForm && (
          <AssistantForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
            editingAssistant={editingAssistant}
          />
        )}

        {/* Call Interface */}
        {assistants.length > 0 && !showCreateForm && (
          <CallInterface assistants={assistants} />
        )}

        {/* AI Agents Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assistants.map((assistant) => (
            <AssistantCard
              key={assistant.id}
              assistant={assistant}
              onEdit={startEdit}
              onDelete={deleteAssistant}
            />
          ))}
        </div>

        {assistants.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">No AI agents created yet</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First AI Agent
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Assistants;
