
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Edit, Trash2, Phone, PhoneCall } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showErrorToast, showSuccessToast } from '@/utils/errorHandling';
import { Assistant } from '@/types/assistant';

interface AssistantCardProps {
  assistant: Assistant;
  onEdit: (assistant: Assistant) => void;
  onDelete: (id: string) => void;
}

const AssistantCard: React.FC<AssistantCardProps> = ({
  assistant,
  onEdit,
  onDelete
}) => {
  const [playingAudio, setPlayingAudio] = useState(false);
  const [makingCall, setMakingCall] = useState(false);

  const handleVoicePreview = async () => {
    try {
      setPlayingAudio(true);
      
      const textToSpeak = assistant.first_message || 
        `Hello! I'm ${assistant.name}, your AI assistant. How can I help you today?`;

      console.log('Generating voice preview for:', assistant.name);
      console.log('Text to speak:', textToSpeak);
      console.log('Voice ID:', assistant.voice_id);
      console.log('Voice provider:', assistant.voice_provider);
      
      const requestBody = {
        text: textToSpeak,
        voice: assistant.voice_id,
        voice_provider: assistant.voice_provider || 'deepgram'
      };

      console.log('Sending request body to text-to-speech:', requestBody);
      
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: requestBody
      });

      console.log('Text-to-speech response:', { data, error });

      if (error) {
        console.error('Text-to-speech error:', error);
        throw error;
      }

      if (data?.audioContent) {
        // Convert base64 to audio blob and play
        const binaryString = atob(data.audioContent);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        const audioBlob = new Blob([bytes], { type: 'audio/wav' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        audio.onended = () => {
          setPlayingAudio(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        audio.onerror = () => {
          setPlayingAudio(false);
          URL.revokeObjectURL(audioUrl);
          showErrorToast('Failed to play audio');
        };
        
        await audio.play();
        showSuccessToast('Playing voice preview');
      } else {
        throw new Error('No audio content received');
      }
    } catch (error) {
      console.error('Error generating voice preview:', error);
      setPlayingAudio(false);
      showErrorToast('Failed to generate voice preview');
    }
  };

  const handleTestCall = async () => {
    try {
      setMakingCall(true);
      
      // Get user's phone number
      const phoneNumber = prompt('Enter your phone number for the test call (e.g., +1234567890):');
      
      if (!phoneNumber) {
        setMakingCall(false);
        return;
      }

      // Validate phone number format
      const cleanNumber = phoneNumber.replace(/\D/g, '');
      if (cleanNumber.length < 10) {
        showErrorToast('Please enter a valid phone number');
        setMakingCall(false);
        return;
      }

      console.log('Initiating test call with assistant:', assistant.name);
      
      const callParams = {
        phoneNumber: phoneNumber,
        assistantId: assistant.id,
        campaignId: null,
        contactId: null
      };

      console.log('Call parameters:', callParams);
      
      const { data, error } = await supabase.functions.invoke('make-outbound-call', {
        body: callParams
      });

      console.log('Call response:', { data, error });

      if (error) {
        console.error('Call error:', error);
        throw error;
      }

      if (data?.success) {
        showSuccessToast(
          `Test call initiated successfully! You should receive a call shortly from ${assistant.name}. The AI will use DeepGram for real-time conversation.`
        );
      } else {
        throw new Error(data?.error || 'Failed to initiate call');
      }
    } catch (error) {
      console.error('Error making test call:', error);
      showErrorToast('Failed to initiate test call');
    } finally {
      setMakingCall(false);
    }
  };

  // Get voice display name for DeepGram voices
  const getVoiceDisplayName = () => {
    const deepgramVoices: Record<string, string> = {
      'aura-asteria-en': 'Asteria (Female)',
      'aura-luna-en': 'Luna (Female)',
      'aura-stella-en': 'Stella (Female)',
      'aura-athena-en': 'Athena (Female)',
      'aura-hera-en': 'Hera (Female)',
      'aura-orion-en': 'Orion (Male)',
      'aura-arcas-en': 'Arcas (Male)',
      'aura-perseus-en': 'Perseus (Male)',
      'aura-angus-en': 'Angus (Male)',
      'aura-orpheus-en': 'Orpheus (Male)',
      'aura-helios-en': 'Helios (Male)',
      'aura-zeus-en': 'Zeus (Male)'
    };
    
    return deepgramVoices[assistant.voice_id] || assistant.voice_id;
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold">{assistant.name || 'Unnamed Assistant'}</CardTitle>
          <div className="flex space-x-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(assistant)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onDelete(assistant.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600">
          DeepGram STT/TTS • {assistant.model || 'nova-2'} model
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            System Prompt
          </label>
          <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-700 max-h-20 overflow-y-auto">
            {assistant.system_prompt || 'No system prompt defined'}
          </div>
        </div>

        {assistant.first_message && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Message
            </label>
            <div className="px-3 py-2 bg-gray-100 rounded-md text-sm text-gray-700 max-h-16 overflow-y-auto">
              {assistant.first_message}
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <div>Voice: {getVoiceDisplayName()}</div>
          <div>Temperature: {assistant.temperature ?? 0.8}</div>
          <div>Max Tokens: {assistant.max_tokens ?? 500}</div>
          <div>Created: {assistant.created_at ? new Date(assistant.created_at).toLocaleDateString() : 'Unknown'}</div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={handleVoicePreview}
            variant="outline"
            className="w-full"
            disabled={playingAudio || makingCall}
          >
            {playingAudio ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Playing...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Test Voice
              </>
            )}
          </Button>

          <Button
            onClick={handleTestCall}
            variant="default"
            className="w-full"
            disabled={makingCall || playingAudio}
          >
            {makingCall ? (
              <>
                <PhoneCall className="w-4 h-4 mr-2" />
                Calling...
              </>
            ) : (
              <>
                <Phone className="w-4 h-4 mr-2" />
                Real Call Test
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
          💡 This assistant uses DeepGram for real-time speech recognition and synthesis, providing natural conversation without OpenAI dependency.
        </div>
      </CardContent>
    </Card>
  );
};

export default AssistantCard;
