
import { useState, useEffect } from 'react';
import { Agent, CreateAgentRequest } from '../types/agent';

const STORAGE_KEY = 'voice_agents';

export const useAgentStorage = () => {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setAgents(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load agents:', error);
    }
  };

  const saveAgents = (newAgents: Agent[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newAgents));
      setAgents(newAgents);
    } catch (error) {
      console.error('Failed to save agents:', error);
    }
  };

  const createAgent = async (agentData: CreateAgentRequest): Promise<Agent> => {
    const newAgent: Agent = {
      ...agentData,
      id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      voiceSettings: {
        model: 'aura-asteria-en',
        speed: 1.0,
        stability: 0.8,
        ...agentData.voiceSettings
      },
      conversationSettings: {
        maxTurnLength: 200,
        responseDelay: 500,
        endCallPhrases: ['goodbye', 'end call', 'hang up'],
        ...agentData.conversationSettings
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const newAgents = [...agents, newAgent];
    saveAgents(newAgents);
    return newAgent;
  };

  const updateAgent = async (agentId: string, agentData: Partial<CreateAgentRequest>): Promise<Agent | null> => {
    const newAgents = agents.map(agent => {
      if (agent.id === agentId) {
        return {
          ...agent,
          ...agentData,
          updatedAt: new Date().toISOString()
        };
      }
      return agent;
    });

    saveAgents(newAgents);
    return newAgents.find(a => a.id === agentId) || null;
  };

  const deleteAgent = async (agentId: string): Promise<boolean> => {
    const newAgents = agents.filter(agent => agent.id !== agentId);
    saveAgents(newAgents);
    return true;
  };

  const getAgent = (agentId: string): Agent | null => {
    return agents.find(agent => agent.id === agentId) || null;
  };

  return {
    agents,
    createAgent,
    updateAgent,
    deleteAgent,
    getAgent,
    loadAgents
  };
};
