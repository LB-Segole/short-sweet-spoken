
import React, { useCallback, useRef, useState } from 'react';
import ReactFlow, {
  Node,
  Edge,
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
import { FlowNode, FlowEdge, AgentFlow } from '@/types/agentFlow';
import { Button } from '@/components/ui/button';
import { Save, Play, Download, Upload } from 'lucide-react';

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
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

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
          label: `${type} node`,
          config: getDefaultNodeConfig(type),
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const getDefaultNodeConfig = (type: string) => {
    switch (type) {
      case 'start':
        return { greeting_message: 'Hello! How can I help you today?' };
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
        };
      case 'integration':
        return {
          integration_type: 'webhook',
          endpoint: '',
          method: 'POST',
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
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
  }, []);

  return (
    <div className="h-full flex">
      <NodeToolbar />
      
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <Button onClick={handleSave} size="sm">
            <Save className="w-4 h-4 mr-2" />
            Save Flow
          </Button>
          <Button onClick={handleTest} size="sm" variant="outline">
            <Play className="w-4 h-4 mr-2" />
            Test Flow
          </Button>
        </div>

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
        >
          <Controls />
          <MiniMap />
          <Background />
        </ReactFlow>
      </div>
    </div>
  );
};

export const FlowEditorWrapper: React.FC<FlowEditorProps> = (props) => (
  <ReactFlowProvider>
    <FlowEditor {...props} />
  </ReactFlowProvider>
);
