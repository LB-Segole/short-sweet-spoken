
import React, { useState } from 'react';
import { AgentManager } from '../agents/AgentManager';
import { CallInterface } from './CallInterface';
import { Agent } from '../types/agent';

export const VoiceAgentApp: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isCallActive, setIsCallActive] = useState(false);

  const handleStartCall = (agent: Agent) => {
    setSelectedAgent(agent);
    setIsCallActive(true);
  };

  const handleCallEnd = () => {
    setSelectedAgent(null);
    setIsCallActive(false);
  };

  if (selectedAgent && isCallActive) {
    return (
      <CallInterface 
        selectedAgent={selectedAgent} 
        onCallEnd={handleCallEnd}
      />
    );
  }

  return (
    <AgentManager 
      onStartCall={handleStartCall}
      isCallActive={isCallActive}
    />
  );
};
