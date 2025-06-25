
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AgentFlow } from '@/types/agentFlow';
import { X, Play, RotateCcw, MessageSquare, Zap } from 'lucide-react';

interface FlowExecutionPanelProps {
  flow: AgentFlow;
  onClose: () => void;
}

interface ExecutionStep {
  id: string;
  nodeId: string;
  nodeType: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  input?: any;
  output?: any;
  timestamp: Date;
  error?: string;
}

export const FlowExecutionPanel: React.FC<FlowExecutionPanelProps> = ({ flow, onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [testInput, setTestInput] = useState('Hello, I need help with my account');

  const simulateFlowExecution = async () => {
    setIsRunning(true);
    setExecutionSteps([]);
    setCurrentStepIndex(-1);

    // Find start node
    const startNode = flow.nodes.find(node => node.type === 'start');
    if (!startNode) {
      console.error('No start node found');
      setIsRunning(false);
      return;
    }

    const steps: ExecutionStep[] = [];
    let currentNodeId: string | null = startNode.id;

    // Simulate execution flow
    while (currentNodeId && steps.length < 10) { // Prevent infinite loops
      const currentNode = flow.nodes.find(node => node.id === currentNodeId);
      if (!currentNode) break;

      const step: ExecutionStep = {
        id: `step-${steps.length}`,
        nodeId: currentNode.id,
        nodeType: currentNode.type,
        status: 'running',
        timestamp: new Date(),
        input: steps.length === 0 ? testInput : steps[steps.length - 1]?.output,
      };

      steps.push(step);
      setExecutionSteps([...steps]);
      setCurrentStepIndex(steps.length - 1);

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Simulate node execution
      const output = await simulateNodeExecution(currentNode, step.input);
      step.output = output;
      step.status = 'completed';
      setExecutionSteps([...steps]);

      // Find next node
      const outgoingEdge = flow.edges.find(edge => edge.source === currentNodeId);
      currentNodeId = outgoingEdge?.target || null;

      if (currentNode.type === 'end') break;
    }

    setIsRunning(false);
  };

  const simulateNodeExecution = async (node: any, input: any): Promise<any> => {
    switch (node.type) {
      case 'start':
        return {
          message: node.data.config.greeting_message || 'Hello! How can I help you?',
          user_input: input,
        };
      
      case 'ai_message':
        return {
          response: `AI Response: I understand you said "${input}". Let me help you with that.`,
          confidence: 0.95,
        };
      
      case 'condition':
        const condition = node.data.config.condition_value || 'help';
        const matches = input?.toLowerCase().includes(condition.toLowerCase());
        return {
          condition_met: matches,
          matched_value: condition,
          user_input: input,
        };
      
      case 'integration':
        return {
          integration_result: 'Successfully called external API',
          data: { status: 'success', id: '12345' },
        };
      
      case 'transfer':
        return {
          transfer_initiated: true,
          target: node.data.config.target || 'human agent',
          message: node.data.config.message,
        };
      
      case 'variable':
        return {
          variable_set: true,
          variable_name: node.data.config.variable_name,
          variable_value: input,
        };
      
      case 'end':
        return {
          session_ended: true,
          final_message: node.data.config.end_message || 'Goodbye!',
        };
      
      default:
        return { processed: true, input };
    }
  };

  const resetExecution = () => {
    setExecutionSteps([]);
    setCurrentStepIndex(-1);
    setIsRunning(false);
  };

  const getStatusColor = (status: ExecutionStep['status']) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-700';
      case 'running': return 'bg-blue-100 text-blue-700';
      case 'completed': return 'bg-green-100 text-green-700';
      case 'error': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getNodeIcon = (nodeType: string) => {
    switch (nodeType) {
      case 'ai_message': return <MessageSquare className="w-4 h-4" />;
      case 'integration': return <Zap className="w-4 h-4" />;
      default: return <div className="w-4 h-4 rounded-full bg-gray-400" />;
    }
  };

  return (
    <Card className="w-96 h-full border-l bg-white shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Flow Execution</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Test Input */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Test Input</label>
          <Input
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Enter test message..."
            disabled={isRunning}
          />
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button 
            onClick={simulateFlowExecution} 
            disabled={isRunning}
            size="sm"
            className="flex items-center gap-2"
          >
            <Play className="w-4 h-4" />
            {isRunning ? 'Running...' : 'Run Test'}
          </Button>
          <Button 
            onClick={resetExecution} 
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        </div>

        {/* Execution Steps */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Execution Steps</h4>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {executionSteps.map((step, index) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg border ${
                    index === currentStepIndex ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getNodeIcon(step.nodeType)}
                      <span className="text-sm font-medium capitalize">
                        {step.nodeType.replace('_', ' ')}
                      </span>
                    </div>
                    <Badge className={getStatusColor(step.status)}>
                      {step.status}
                    </Badge>
                  </div>
                  
                  {step.input && (
                    <div className="text-xs text-gray-600 mb-1">
                      <strong>Input:</strong> {JSON.stringify(step.input, null, 2)}
                    </div>
                  )}
                  
                  {step.output && (
                    <div className="text-xs text-gray-600">
                      <strong>Output:</strong> {JSON.stringify(step.output, null, 2)}
                    </div>
                  )}
                  
                  {step.error && (
                    <div className="text-xs text-red-600">
                      <strong>Error:</strong> {step.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};
