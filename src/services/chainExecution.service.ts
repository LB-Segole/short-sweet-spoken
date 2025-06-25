
import { supabase } from '@/lib/supabase';

export interface ChainExecution {
  id: string;
  chain_id: string;
  call_id?: string;
  current_step_id?: string;
  status: 'running' | 'completed' | 'failed' | 'timeout';
  execution_log: Array<{
    step_id: string;
    agent_id?: string;
    timestamp: string;
    status: 'started' | 'completed' | 'failed' | 'timeout';
    input?: any;
    output?: any;
    error?: string;
  }>;
  started_at: string;
  completed_at?: string;
  error_message?: string;
}

export interface AgentHandoffContext {
  conversation_history: Array<{
    speaker: string;
    message: string;
    timestamp: string;
  }>;
  extracted_entities: Record<string, any>;
  user_intent: string;
  confidence_score: number;
  previous_agent_id?: string;
  handoff_reason: 'escalation' | 'specialization' | 'timeout' | 'user_request';
}

class ChainExecutionService {
  async startChainExecution(chainId: string, callId?: string): Promise<ChainExecution> {
    console.log('Starting chain execution:', { chainId, callId });
    
    // Create new execution record
    const { data: execution, error } = await supabase
      .from('chain_executions')
      .insert({
        chain_id: chainId,
        call_id: callId,
        status: 'running'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating chain execution:', error);
      throw error;
    }

    // Get chain configuration
    const { data: chain, error: chainError } = await supabase
      .from('agent_chains')
      .select(`
        *,
        chain_steps (
          id,
          step_order,
          agent_id,
          conditions,
          timeout_seconds,
          fallback_step_id
        )
      `)
      .eq('id', chainId)
      .single();

    if (chainError) {
      console.error('Error fetching chain:', chainError);
      throw chainError;
    }

    // Start with first step
    const firstStep = chain.chain_steps
      .sort((a: any, b: any) => a.step_order - b.step_order)[0];

    if (firstStep) {
      await this.executeStep(execution.id, firstStep.id);
    }

    return execution;
  }

  async executeStep(executionId: string, stepId: string, context?: AgentHandoffContext): Promise<void> {
    console.log('Executing step:', { executionId, stepId });

    // Get step details
    const { data: step, error: stepError } = await supabase
      .from('chain_steps')
      .select('*')
      .eq('id', stepId)
      .single();

    if (stepError) {
      console.error('Error fetching step:', stepError);
      return;
    }

    // Update current step in execution
    await supabase
      .from('chain_executions')
      .update({ current_step_id: stepId })
      .eq('id', executionId);

    // Log step start
    await this.logStepEvent(executionId, stepId, 'started', { context });

    try {
      // Execute step based on type
      if (step.agent_id) {
        await this.executeAgentStep(executionId, step, context);
      } else {
        // Handle other step types (conditions, etc.)
        await this.executeConditionStep(executionId, step, context);
      }
    } catch (error) {
      console.error('Step execution failed:', error);
      await this.handleStepFailure(executionId, step, error as Error);
    }
  }

  private async executeAgentStep(executionId: string, step: any, context?: AgentHandoffContext): Promise<void> {
    console.log('Executing agent step:', step.agent_id);

    // Get agent details
    const { data: agent, error: agentError } = await supabase
      .from('assistants')
      .select('*')
      .eq('id', step.agent_id)
      .single();

    if (agentError) {
      throw new Error(`Agent not found: ${step.agent_id}`);
    }

    // Set timeout
    const timeout = setTimeout(() => {
      this.handleStepTimeout(executionId, step);
    }, (step.timeout_seconds || 300) * 1000);

    try {
      // Simulate agent execution (replace with actual agent call)
      const result = await this.callAgent(agent, context);
      
      clearTimeout(timeout);
      
      // Log success
      await this.logStepEvent(executionId, step.id, 'completed', { 
        output: result,
        agent_id: step.agent_id
      });

      // Check if there's a next step
      await this.proceedToNextStep(executionId, step, result);
      
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  private async executeConditionStep(executionId: string, step: any, context?: AgentHandoffContext): Promise<void> {
    console.log('Executing condition step:', step.conditions);

    // Evaluate conditions based on context
    const conditionResult = this.evaluateConditions(step.conditions, context);
    
    // Log step completion
    await this.logStepEvent(executionId, step.id, 'completed', { 
      output: conditionResult 
    });

    // Proceed based on condition result
    await this.proceedToNextStep(executionId, step, conditionResult);
  }

  private async callAgent(agent: any, context?: AgentHandoffContext): Promise<any> {
    // This would integrate with your actual agent calling system
    console.log('Calling agent:', agent.name, 'with context:', context);
    
    // For now, simulate agent response
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          response: `Response from ${agent.name}`,
          confidence: 0.8,
          intent: 'handled',
          handoff_needed: false
        });
      }, 1000);
    });
  }

  private evaluateConditions(conditions: any, context?: AgentHandoffContext): boolean {
    // Implement condition evaluation logic
    console.log('Evaluating conditions:', conditions, 'with context:', context);
    
    // Simple condition evaluation (extend as needed)
    if (conditions.type === 'confidence_threshold') {
      return (context?.confidence_score || 0) >= (conditions.threshold || 0.7);
    }
    
    if (conditions.type === 'intent_match') {
      return context?.user_intent === conditions.intent;
    }
    
    return true;
  }

  private async proceedToNextStep(executionId: string, currentStep: any, result: any): Promise<void> {
    // Get execution details
    const { data: execution, error } = await supabase
      .from('chain_executions')
      .select(`
        *,
        agent_chains!inner (
          chain_steps (
            id,
            step_order,
            agent_id,
            conditions,
            timeout_seconds,
            fallback_step_id
          )
        )
      `)
      .eq('id', executionId)
      .single();

    if (error) {
      console.error('Error fetching execution:', error);
      return;
    }

    const steps = execution.agent_chains.chain_steps
      .sort((a: any, b: any) => a.step_order - b.step_order);
    
    const currentIndex = steps.findIndex((s: any) => s.id === currentStep.id);
    const nextStep = steps[currentIndex + 1];

    if (nextStep) {
      // Continue with next step
      await this.executeStep(executionId, nextStep.id, this.buildHandoffContext(result));
    } else {
      // Chain completed
      await this.completeChainExecution(executionId, 'completed');
    }
  }

  private async handleStepFailure(executionId: string, step: any, error: Error): Promise<void> {
    console.error('Step failed:', step.id, error.message);
    
    // Log failure
    await this.logStepEvent(executionId, step.id, 'failed', { 
      error: error.message 
    });

    // Try fallback step if available
    if (step.fallback_step_id) {
      console.log('Attempting fallback step:', step.fallback_step_id);
      await this.executeStep(executionId, step.fallback_step_id);
    } else {
      // No fallback, fail the entire chain
      await this.completeChainExecution(executionId, 'failed', error.message);
    }
  }

  private async handleStepTimeout(executionId: string, step: any): Promise<void> {
    console.log('Step timed out:', step.id);
    
    // Log timeout
    await this.logStepEvent(executionId, step.id, 'timeout');

    // Try fallback or fail
    if (step.fallback_step_id) {
      await this.executeStep(executionId, step.fallback_step_id);
    } else {
      await this.completeChainExecution(executionId, 'timeout', 'Step execution timed out');
    }
  }

  private async logStepEvent(executionId: string, stepId: string, status: string, data?: any): Promise<void> {
    // Get current execution log
    const { data: execution } = await supabase
      .from('chain_executions')
      .select('execution_log')
      .eq('id', executionId)
      .single();

    const currentLog = execution?.execution_log || [];
    const newLogEntry = {
      step_id: stepId,
      timestamp: new Date().toISOString(),
      status,
      ...data
    };

    // Update execution log
    await supabase
      .from('chain_executions')
      .update({
        execution_log: [...currentLog, newLogEntry]
      })
      .eq('id', executionId);
  }

  private async completeChainExecution(executionId: string, status: 'completed' | 'failed' | 'timeout', errorMessage?: string): Promise<void> {
    console.log('Completing chain execution:', executionId, status);
    
    await supabase
      .from('chain_executions')
      .update({
        status,
        completed_at: new Date().toISOString(),
        error_message: errorMessage
      })
      .eq('id', executionId);
  }

  private buildHandoffContext(result: any): AgentHandoffContext {
    // Build context for agent handoff
    return {
      conversation_history: result.conversation_history || [],
      extracted_entities: result.entities || {},
      user_intent: result.intent || 'unknown',
      confidence_score: result.confidence || 0.5,
      handoff_reason: 'specialization'
    };
  }

  async getChainExecution(executionId: string): Promise<ChainExecution | null> {
    const { data, error } = await supabase
      .from('chain_executions')
      .select('*')
      .eq('id', executionId)
      .single();

    if (error) {
      console.error('Error fetching chain execution:', error);
      return null;
    }

    return data;
  }

  async getActiveExecutions(chainId?: string): Promise<ChainExecution[]> {
    let query = supabase
      .from('chain_executions')
      .select('*')
      .eq('status', 'running');

    if (chainId) {
      query = query.eq('chain_id', chainId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching active executions:', error);
      return [];
    }

    return data || [];
  }
}

export const chainExecutionService = new ChainExecutionService();
