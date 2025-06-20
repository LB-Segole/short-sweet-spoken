
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AssistantFormData, Assistant } from '@/types/assistant';

interface AssistantFormProps {
  formData: AssistantFormData;
  setFormData: React.Dispatch<React.SetStateAction<AssistantFormData>>;
  onSubmit: () => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
  editingAssistant: Assistant | null;
}

// Real Deepgram voice options
const deepgramVoices = [
  { id: 'aura-asteria-en', name: 'Asteria (Female, Conversational)' },
  { id: 'aura-luna-en', name: 'Luna (Female, Expressive)' },
  { id: 'aura-stella-en', name: 'Stella (Female, Friendly)' },
  { id: 'aura-athena-en', name: 'Athena (Female, Authoritative)' },
  { id: 'aura-hera-en', name: 'Hera (Female, Business)' },
  { id: 'aura-orion-en', name: 'Orion (Male, Authoritative)' },
  { id: 'aura-arcas-en', name: 'Arcas (Male, Conversational)' },
  { id: 'aura-perseus-en', name: 'Perseus (Male, Confident)' },
  { id: 'aura-angus-en', name: 'Angus (Male, Narration)' },
  { id: 'aura-orpheus-en', name: 'Orpheus (Male, Confident)' },
  { id: 'aura-helios-en', name: 'Helios (Male, Authoritative)' },
  { id: 'aura-zeus-en', name: 'Zeus (Male, Authoritative)' }
];

// Deepgram models
const deepgramModels = [
  { id: 'nova-2', name: 'Nova-2 (Latest, Most Accurate)' },
  { id: 'nova', name: 'Nova (Previous Generation)' },
  { id: 'enhanced', name: 'Enhanced (Legacy)' },
  { id: 'base', name: 'Base (Legacy)' }
];

const AssistantForm: React.FC<AssistantFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isSubmitting,
  editingAssistant
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingAssistant ? 'Edit AI Agent' : 'Create New AI Agent'}</CardTitle>
        <p className="text-sm text-gray-600">
          Voice AI agent powered by DeepGram for real-time conversation
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name *</label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Assistant name"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Model</label>
            <Select value={formData.model} onValueChange={(value) => setFormData(prev => ({ ...prev, model: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {deepgramModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">System Prompt *</label>
          <Textarea
            value={formData.system_prompt}
            onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
            placeholder="Define the assistant's role and personality. For example: 'You are a helpful customer service assistant. Be friendly, professional, and concise in your responses. You work for First Choice Solutions and help customers with their business needs.'"
            className="min-h-[100px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">First Message</label>
          <Textarea
            value={formData.first_message}
            onChange={(e) => setFormData(prev => ({ ...prev, first_message: e.target.value }))}
            placeholder="Hello! I'm your AI assistant from First Choice Solutions. How can I help you today?"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">DeepGram Voice</label>
          <Select 
            value={formData.voice_id} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, voice_id: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {deepgramVoices.map((voice) => (
                <SelectItem key={voice.id} value={voice.id}>
                  {voice.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500 mt-1">
            All voices use DeepGram's real-time TTS for natural conversation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Temperature</label>
            <Input
              type="number"
              min="0"
              max="2"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
            />
            <p className="text-xs text-gray-500 mt-1">Controls randomness (0.0 = focused, 2.0 = creative)</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Max Tokens</label>
            <Input
              type="number"
              min="50"
              max="2000"
              step="50"
              value={formData.max_tokens}
              onChange={(e) => setFormData(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
            />
            <p className="text-xs text-gray-500 mt-1">Maximum response length</p>
          </div>
        </div>

        <div className="flex space-x-4">
          <Button 
            onClick={onSubmit}
            disabled={!formData.name || !formData.system_prompt || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (editingAssistant ? 'Update' : 'Create')} AI Agent
          </Button>
          <Button 
            variant="outline" 
            onClick={onCancel}
          >
            Cancel
          </Button>
        </div>

        <div className="text-xs text-blue-600 bg-blue-50 p-3 rounded">
          💡 <strong>DeepGram Integration:</strong> This agent uses DeepGram for both speech-to-text and text-to-speech, 
          providing real-time conversation capabilities without OpenAI dependency for voice processing.
        </div>
      </CardContent>
    </Card>
  );
};

export default AssistantForm;
