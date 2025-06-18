
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

// Voice options for different providers
const voiceOptions = {
  openai: [
    { id: 'alloy', name: 'Alloy (Neutral)' },
    { id: 'echo', name: 'Echo (Male)' },
    { id: 'fable', name: 'Fable (British Male)' },
    { id: 'onyx', name: 'Onyx (Deep Male)' },
    { id: 'nova', name: 'Nova (Female)' },
    { id: 'shimmer', name: 'Shimmer (Female)' }
  ],
  elevenlabs: [
    { id: '9BWtsMINqrJLrRacOk9x', name: 'Aria' },
    { id: 'CwhRBWXzGAHq8TQ4Fs17', name: 'Roger' },
    { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah' },
    { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura' },
    { id: 'IKne3meq5aSn9XLyUdCD', name: 'Charlie' },
    { id: 'JBFqnCBsd6RMkjVDRZzb', name: 'George' },
    { id: 'N2lVS1w4EtoT3dr4eOWO', name: 'Callum' },
    { id: 'SAz9YHcvj6GT2YYXdXww', name: 'River' },
    { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam' },
    { id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte' }
  ]
};

const AssistantForm: React.FC<AssistantFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  onCancel,
  isSubmitting,
  editingAssistant
}) => {
  const currentVoiceOptions = voiceOptions[formData.voice_provider as keyof typeof voiceOptions] || voiceOptions.openai;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{editingAssistant ? 'Edit AI Agent' : 'Create New AI Agent'}</CardTitle>
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
                <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                <SelectItem value="gpt-4">GPT-4</SelectItem>
                <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">System Prompt *</label>
          <Textarea
            value={formData.system_prompt}
            onChange={(e) => setFormData(prev => ({ ...prev, system_prompt: e.target.value }))}
            placeholder="Define the assistant's role and personality. For example: 'You are a helpful customer service assistant. Be friendly, professional, and concise in your responses.'"
            className="min-h-[100px]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">First Message</label>
          <Textarea
            value={formData.first_message}
            onChange={(e) => setFormData(prev => ({ ...prev, first_message: e.target.value }))}
            placeholder="Hello! I'm your AI assistant. How can I help you today?"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Voice Provider</label>
            <Select 
              value={formData.voice_provider} 
              onValueChange={(value) => {
                setFormData(prev => ({ 
                  ...prev, 
                  voice_provider: value,
                  // Reset voice_id when provider changes
                  voice_id: value === 'openai' ? 'alloy' : '9BWtsMINqrJLrRacOk9x'
                }))
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="elevenlabs">ElevenLabs</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Voice</label>
            <Select 
              value={formData.voice_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, voice_id: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentVoiceOptions.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
      </CardContent>
    </Card>
  );
};

export default AssistantForm;
