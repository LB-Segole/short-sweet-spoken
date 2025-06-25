
import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Node,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  ReactFlowProvider,
  ReactFlowInstance,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { StartNode } from './nodes/StartNode';
import { AIMessageNode } from './nodes/AIMessageNode';
import { ConditionNode } from './nodes/ConditionNode';
import { IntegrationNode } from './nodes/IntegrationNode';
import { TransferNode } from './nodes/TransferNode';
import { EndNode } from './nodes/EndNode';
import { VariableNode } from './nodes/VariableNode';
import { NodeToolbar } from './NodeToolbar';
import { FlowExecutionPanel } from './FlowExecutionPanel';
import { FlowNode, FlowEdge, AgentFlow } from '@/types/agentFlow';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Save, Play, Eye, Settings, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const nodeTypes = {
  start: StartNode,
  ai_message: AIMessageNode,
  condition: ConditionNode,
  integration: IntegrationNode,
  transfer: TransferNode,
  end: EndNode,
  variable: VariableNode,
};

interface FlowEditorProps {
  flow?: AgentFlow;
  onSave?: (flow: AgentFlow) => void;
  onTest?: (flow: AgentFlow) => void;
}

export const FlowEditor: React.FC<FlowEditorProps> = ({ flow, onSave, onTest }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(flow?.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow?.edges || []);
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { toast } = useToast();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type || !reactFlowInstance || !reactFlowBounds) {
        return;
      }

      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: `${type.replace('_', ' ')} node`,
          config: getDefaultNodeConfig(type),
        },
      };

      setNodes((nds) => nds.concat(newNode));
      
      toast({
        title: "Node Added",
        description: `${type.replace('_', ' ')} node has been added to the flow.`,
      });
    },
    [reactFlowInstance, setNodes, toast]
  );

  const getDefaultNodeConfig = (type: string) => {
    switch (type) {
      case 'start':
        return { 
          greeting_message: 'Hello! How can I help you today?',
          voice_settings: { voice_id: 'aura-asteria-en', speed: 1.0 }
        };
      case 'ai_message':
        return {
          system_prompt: 'You are a helpful assistant.',
          temperature: 0.7,
          max_tokens: 150,
          model: 'gpt-4o',
        };
      case 'condition':
        return {
          condition_type: 'keyword',
          condition_value: '',
          true_path: null,
          false_path: null,
        };
      case 'integration':
        return {
          integration_type: 'webhook',
          endpoint: '',
          method: 'POST',
          headers: {},
          body: {},
        };
      case 'transfer':
        return {
          transfer_type: 'human',
          target: '',
          message: 'Transferring you to a human agent...',
        };
      case 'end':
        return {
          end_message: 'Thank you for your time. Goodbye!',
          save_conversation: true,
        };
      case 'variable':
        return {
          variable_name: 'user_input',
          variable_type: 'string',
          default_value: '',
        };
      default:
        return {};
    }
  };

  const handleSave = () => {
    if (!onSave) return;
    
    const flowData: AgentFlow = {
      id: flow?.id || `flow-${Date.now()}`,
      name: flow?.name || 'Untitled Flow',
      description: flow?.description,
      nodes: nodes as FlowNode[],
      edges: edges as FlowEdge[],
      created_at: flow?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: flow?.user_id || 'current-user',
      is_active: flow?.is_active || false,
    };
    
    onSave(flowData);
    
    toast({
      title: "Flow Saved",
      description: "Your agent flow has been saved successfully.",
    });
  };

  const handleTest = () => {
    if (!onTest) return;
    
    const flowData: AgentFlow = {
      id: flow?.id || `flow-${Date.now()}`,
      name: flow?.name || 'Test Flow',
      description: flow?.description,
      nodes: nodes as FlowNode[],
      edges: edges as FlowEdge[],
      created_at: flow?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: flow?.user_id || 'current-user',
      is_active: true,
    };
    
    onTest(flowData);
    setShowExecutionPanel(true);
  };

  const onNodeClick = useCallback((_event: React.MouseEvent, _node: Node) => {
    // Node click handler - currently unused but available for future features
  }, []);

  return (
    <div className="h-full flex">
      <NodeToolbar />
      
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        {/* Enhanced Toolbar */}
        <Card className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-3">
            <div className="flex gap-2">
              <Button onClick={handleSave} size="sm" className="flex items-center gap-2">
                <Save className="w-4 h-4" />
                Save Flow
              </Button>
              <Button 
                onClick={handleTest} 
                size="sm" 
                variant="outline"
                className="flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Test Flow
              </Button>
              <Button 
                onClick={() => setShowExecutionPanel(!showExecutionPanel)} 
                size="sm" 
                variant="outline"
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button 
                onClick={() => setShowSettings(!showSettings)} 
                size="sm" 
                variant="outline"
                className="flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Flow Statistics */}
        <Card className="absolute top-4 right-4 z-10 bg-white/95 backdrop-blur-sm">
          <CardContent className="p-3">
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>Nodes: {nodes.length}</span>
              <span>Connections: {edges.length}</span>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                <span>{nodes.filter(n => n.type === 'integration').length} Integrations</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={setReactFlowInstance}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          className="bg-gray-50"
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
        >
          <Controls />
          <MiniMap />
          <Background gap={20} size={1} color="#e5e7eb" />
        </ReactFlow>
      </div>

      {/* Execution Panel */}
      {showExecutionPanel && (
        <FlowExecutionPanel
          flow={{
            id: flow?.id || `flow-${Date.now()}`,
            name: flow?.name || 'Test Flow',
            description: flow?.description,
            nodes: nodes as FlowNode[],
            edges: edges as FlowEdge[],
            created_at: flow?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            user_id: flow?.user_id || 'current-user',
            is_active: true,
          }}
          onClose={() => setShowExecutionPanel(false)}
        />
      )}
    </div>
  );
};

export const FlowEditorWrapper: React.FC<FlowEditorProps> = (props) => (
  <ReactFlowProvider>
    <FlowEditor {...props} />
  </ReactFlowProvider>
);
