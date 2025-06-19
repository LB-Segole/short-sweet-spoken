
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Agent, CreateAgentRequest } from '../types/agent';

interface AgentFormProps {
  initialData?: Agent | null;
  onSubmit: (data: CreateAgentRequest) => void;
  onCancel: () => void;
}

export const AgentForm: React.FC<AgentFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState<CreateAgentRequest>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    systemPrompt: initialData?.systemPrompt || 'You are a helpful AI assistant. Be professional, friendly, and concise in your responses.',
    firstMessage: initialData?.firstMessage || 'Hello! How can I help you today?',
    personality: initialData?.personality || 'professional',
    voiceSettings: {
      model: initialData?.voiceSettings?.model || 'aura-asteria-en',
      speed: initialData?.voiceSettings?.speed || 1.0,
      stability: initialData?.voiceSettings?.stability || 0.8,
    },
    conversationSettings: {
      maxTurnLength: initialData?.conversationSettings?.maxTurnLength || 200,
      responseDelay: initialData?.conversationSettings?.responseDelay || 500,
      endCallPhrases: initialData?.conversationSettings?.endCallPhrases || ['goodbye', 'end call', 'hang up'],
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateFormData = (field: keyof CreateAgentRequest, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateNestedFormData = (section: 'voiceSettings' | 'conversationSettings', field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...(prev[section] || {}),
        [field]: value
      }
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">
          {initialData ? 'Edit Agent' : 'Create New Agent'}
        </h2>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Information</h3>
        
        <div>
          <Label htmlFor="name">Agent Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            placeholder="Sales Assistant, Customer Support, etc."
            required
          />
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => updateFormData('description', e.target.value)}
            placeholder="Brief description of the agent's purpose"
          />
        </div>

        <div>
          <Label htmlFor="personality">Personality</Label>
          <Select 
            value={formData.personality} 
            onValueChange={(value) => updateFormData('personality', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="friendly">Friendly</SelectItem>
              <SelectItem value="casual">Casual</SelectItem>
              <SelectItem value="assertive">Assertive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Conversation Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Conversation Settings</h3>
        
        <div>
          <Label htmlFor="systemPrompt">System Prompt *</Label>
          <Textarea
            id="systemPrompt"
            value={formData.systemPrompt}
            onChange={(e) => updateFormData('systemPrompt', e.target.value)}
            placeholder="Define the agent's role, behavior, and conversation style..."
            rows={4}
            required
          />
        </div>

        <div>
          <Label htmlFor="firstMessage">First Message *</Label>
          <Textarea
            id="firstMessage"
            value={formData.firstMessage}
            onChange={(e) => updateFormData('firstMessage', e.target.value)}
            placeholder="The greeting message when the call connects"
            rows={2}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="maxTurnLength">Max Response Length</Label>
            <Input
              id="maxTurnLength"
              type="number"
              value={formData.conversationSettings?.maxTurnLength}
              onChange={(e) => updateNestedFormData('conversationSettings', 'maxTurnLength', parseInt(e.target.value))}
              min="50"
              max="500"
            />
          </div>
          <div>
            <Label htmlFor="responseDelay">Response Delay (ms)</Label>
            <Input
              id="responseDelay"
              type="number"
              value={formData.conversationSettings?.responseDelay}
              onChange={(e) => updateNestedFormData('conversationSettings', 'responseDelay', parseInt(e.target.value))}
              min="100"
              max="2000"
            />
          </div>
        </div>
      </div>

      {/* Voice Settings */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Voice Settings</h3>
        
        <div>
          <Label htmlFor="voiceModel">DeepGram TTS Model</Label>
          <Select 
            value={formData.voiceSettings?.model} 
            onValueChange={(value) => updateNestedFormData('voiceSettings', 'model', value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="aura-asteria-en">Asteria (Female)</SelectItem>
              <SelectItem value="aura-luna-en">Luna (Female)</SelectItem>
              <SelectItem value="aura-stella-en">Stella (Female)</SelectItem>
              <SelectItem value="aura-athena-en">Athena (Female)</SelectItem>
              <SelectItem value="aura-hera-en">Hera (Female)</SelectItem>
              <SelectItem value="aura-orion-en">Orion (Male)</SelectItem>
              <SelectItem value="aura-arcas-en">Arcas (Male)</SelectItem>
              <SelectItem value="aura-perseus-en">Perseus (Male)</SelectItem>
              <SelectItem value="aura-angus-en">Angus (Male)</SelectItem>
              <SelectItem value="aura-orpheus-en">Orpheus (Male)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="speed">Speech Speed</Label>
            <Input
              id="speed"
              type="number"
              step="0.1"
              min="0.5"
              max="2.0"
              value={formData.voiceSettings?.speed}
              onChange={(e) => updateNestedFormData('voiceSettings', 'speed', parseFloat(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="stability">Voice Stability</Label>
            <Input
              id="stability"
              type="number"
              step="0.1"
              min="0.1"
              max="1.0"
              value={formData.voiceSettings?.stability}
              onChange={(e) => updateNestedFormData('voiceSettings', 'stability', parseFloat(e.target.value))}
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!formData.name || !formData.systemPrompt || !formData.firstMessage}>
          {initialData ? 'Update Agent' : 'Create Agent'}
        </Button>
      </div>
    </form>
  );
};
