
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, ArrowDown, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChainStep {
  id: string;
  stepOrder: number;
  agentId?: string;
  conditions: Record<string, any>;
  timeoutSeconds: number;
  fallbackStepId?: string;
}

interface AgentChain {
  id?: string;
  name: string;
  description: string;
  configuration: Record<string, any>;
  steps: ChainStep[];
}

interface AgentChainBuilderProps {
  onSave: (chain: AgentChain) => void;
  existingChain?: AgentChain;
  availableAgents: Array<{ id: string; name: string }>;
}

export const AgentChainBuilder: React.FC<AgentChainBuilderProps> = ({
  onSave,
  existingChain,
  availableAgents
}) => {
  const [chain, setChain] = useState<AgentChain>({
    name: existingChain?.name || '',
    description: existingChain?.description || '',
    configuration: existingChain?.configuration || {},
    steps: existingChain?.steps || []
  });

  const { toast } = useToast();

  const addStep = () => {
    const newStep: ChainStep = {
      id: `step-${Date.now()}`,
      stepOrder: chain.steps.length + 1,
      conditions: {},
      timeoutSeconds: 300
    };
    
    setChain(prev => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }));
  };

  const removeStep = (stepId: string) => {
    setChain(prev => ({
      ...prev,
      steps: prev.steps.filter(step => step.id !== stepId)
        .map((step, index) => ({ ...step, stepOrder: index + 1 }))
    }));
  };

  const updateStep = (stepId: string, updates: Partial<ChainStep>) => {
    setChain(prev => ({
      ...prev,
      steps: prev.steps.map(step => 
        step.id === stepId ? { ...step, ...updates } : step
      )
    }));
  };

  const handleSave = () => {
    if (!chain.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Chain name is required.",
        variant: "destructive"
      });
      return;
    }

    if (chain.steps.length === 0) {
      toast({
        title: "Validation Error", 
        description: "At least one step is required.",
        variant: "destructive"
      });
      return;
    }

    onSave(chain);
    toast({
      title: "Success",
      description: "Agent chain saved successfully."
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agent Chain Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Chain Name</Label>
              <Input
                id="name"
                value={chain.name}
                onChange={(e) => setChain(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter chain name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={chain.description}
                onChange={(e) => setChain(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe this agent chain"
                rows={2}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Chain Steps</CardTitle>
            <Button onClick={addStep} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Step
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {chain.steps.map((step, index) => (
              <div key={step.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Step {step.stepOrder}</Badge>
                    <Settings className="w-4 h-4 text-gray-500" />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(step.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Select Agent</Label>
                    <Select
                      value={step.agentId || ''}
                      onValueChange={(value) => updateStep(step.id, { agentId: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an agent" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableAgents.map(agent => (
                          <SelectItem key={agent.id} value={agent.id}>
                            {agent.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Timeout (seconds)</Label>
                    <Input
                      type="number"
                      value={step.timeoutSeconds}
                      onChange={(e) => updateStep(step.id, { 
                        timeoutSeconds: parseInt(e.target.value) || 300 
                      })}
                      min="30"
                      max="3600"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fallback Agent</Label>
                  <Select
                    value={step.fallbackStepId || ''}
                    onValueChange={(value) => updateStep(step.id, { fallbackStepId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choose fallback agent (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableAgents.map(agent => (
                        <SelectItem key={agent.id} value={agent.id}>
                          {agent.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {index < chain.steps.length - 1 && (
                  <div className="flex justify-center">
                    <ArrowDown className="w-6 h-6 text-gray-400" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button variant="outline">Cancel</Button>
        <Button onClick={handleSave}>Save Chain</Button>
      </div>
    </div>
  );
};
