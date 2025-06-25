
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ChainStep {
  id: string;
  agent_id?: string;
  step_order: number;
  conditions?: Record<string, any>;
  timeout_seconds?: number;
  fallback_step_id?: string;
}

interface AgentChainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (chain: any) => void;
  availableAgents: Array<{ id: string; name: string }>;
  initialData?: any;
}

export const AgentChainDialog: React.FC<AgentChainDialogProps> = ({
  open,
  onOpenChange,
  onSave,
  availableAgents,
  initialData
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [steps, setSteps] = useState<ChainStep[]>(initialData?.steps || []);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const addStep = () => {
    const newStep: ChainStep = {
      id: `step-${Date.now()}`,
      step_order: steps.length + 1,
      timeout_seconds: 300
    };
    setSteps([...steps, newStep]);
  };

  const removeStep = (stepId: string) => {
    setSteps(steps.filter(step => step.id !== stepId));
  };

  const updateStep = (stepId: string, updates: Partial<ChainStep>) => {
    setSteps(steps.map(step => 
      step.id === stepId 
        ? { ...step, ...updates }
        : step
    ));
  };

  const moveStep = (stepId: string, direction: 'up' | 'down') => {
    const stepIndex = steps.findIndex(step => step.id === stepId);
    if (
      (direction === 'up' && stepIndex === 0) || 
      (direction === 'down' && stepIndex === steps.length - 1)
    ) {
      return;
    }

    const newSteps = [...steps];
    const targetIndex = direction === 'up' ? stepIndex - 1 : stepIndex + 1;
    
    [newSteps[stepIndex], newSteps[targetIndex]] = [newSteps[targetIndex], newSteps[stepIndex]];
    
    // Update step orders
    newSteps.forEach((step, index) => {
      step.step_order = index + 1;
    });
    
    setSteps(newSteps);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Validation Error",
        description: "Chain name is required",
        variant: "destructive"
      });
      return;
    }

    if (steps.length === 0) {
      toast({
        title: "Validation Error",
        description: "At least one step is required",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const chainData = {
        name,
        description,
        configuration: {
          steps: steps.map((step, index) => ({
            ...step,
            step_order: index + 1
          }))
        }
      };

      await onSave(chainData);
      onOpenChange(false);
      
      // Reset form
      setName('');
      setDescription('');
      setSteps([]);
    } catch (error) {
      console.error('Failed to save chain:', error);
      toast({
        title: "Error",
        description: "Failed to save chain",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Edit Agent Chain' : 'Create Agent Chain'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="chain-name">Chain Name</Label>
              <Input
                id="chain-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter chain name"
              />
            </div>
            
            <div>
              <Label htmlFor="chain-description">Description</Label>
              <Textarea
                id="chain-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the purpose of this chain"
                rows={3}
              />
            </div>
          </div>

          {/* Chain Steps */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Chain Steps</h3>
              <Button onClick={addStep} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Step
              </Button>
            </div>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <Card key={step.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">
                        Step {index + 1}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moveStep(step.id, 'up')}
                          disabled={index === 0}
                        >
                          ↑
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => moveStep(step.id, 'down')}
                          disabled={index === steps.length - 1}
                        >
                          ↓
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeStep(step.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Agent</Label>
                      <Select
                        value={step.agent_id || ''}
                        onValueChange={(value) => 
                          updateStep(step.id, { agent_id: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select an agent" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableAgents.map((agent) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Timeout (seconds)</Label>
                        <Input
                          type="number"
                          value={step.timeout_seconds || 300}
                          onChange={(e) => 
                            updateStep(step.id, { 
                              timeout_seconds: parseInt(e.target.value) || 300 
                            })
                          }
                          min={10}
                          max={3600}
                        />
                      </div>

                      <div>
                        <Label>Fallback Step</Label>
                        <Select
                          value={step.fallback_step_id || ''}
                          onValueChange={(value) => 
                            updateStep(step.id, { 
                              fallback_step_id: value || undefined 
                            })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select fallback step" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">No fallback</SelectItem>
                            {steps
                              .filter(s => s.id !== step.id)
                              .map((s, i) => (
                                <SelectItem key={s.id} value={s.id}>
                                  Step {i + 1}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {steps.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No steps added yet. Click "Add Step" to get started.
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Save Chain'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
