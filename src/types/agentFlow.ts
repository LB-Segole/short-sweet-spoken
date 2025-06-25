
export interface FlowNode {
  id: string;
  type: 'start' | 'ai_message' | 'condition' | 'integration' | 'transfer' | 'end' | 'variable';
  position: { x: number; y: number };
  data: {
    label: string;
    config: any;
  };
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
}

export interface AgentFlow {
  id: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  created_at: string;
  updated_at: string;
  user_id: string;
  is_active: boolean;
}

export interface NodeConfig {
  start: {
    greeting_message: string;
    voice_settings?: any;
  };
  ai_message: {
    system_prompt: string;
    temperature: number;
    max_tokens: number;
    model: string;
  };
  condition: {
    condition_type: 'keyword' | 'intent' | 'variable';
    condition_value: string;
    true_path?: string;
    false_path?: string;
  };
  integration: {
    integration_type: string;
    endpoint: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    headers?: Record<string, string>;
    body?: any;
  };
  transfer: {
    transfer_type: 'human' | 'phone' | 'email';
    target: string;
    message: string;
  };
  end: {
    end_message: string;
    save_conversation: boolean;
  };
  variable: {
    variable_name: string;
    variable_type: 'string' | 'number' | 'boolean' | 'object';
    default_value?: any;
  };
}
