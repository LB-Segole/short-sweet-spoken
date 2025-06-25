
import { useState, useEffect } from 'react';
import { chainExecutionService, ChainExecution } from '@/services/chainExecution.service';
import { useToast } from '@/hooks/use-toast';

export const useChainExecution = (chainId?: string) => {
  const [executions, setExecutions] = useState<ChainExecution[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const startExecution = async (chainId: string, callId?: string): Promise<ChainExecution | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      const execution = await chainExecutionService.startChainExecution(chainId, callId);
      
      toast({
        title: "Chain Started",
        description: "Agent chain execution has been started successfully.",
      });
      
      return execution;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start chain execution';
      setError(errorMessage);
      
      toast({
        title: "Execution Failed",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const getExecution = async (executionId: string): Promise<ChainExecution | null> => {
    try {
      setIsLoading(true);
      const execution = await chainExecutionService.getChainExecution(executionId);
      return execution;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch execution';
      setError(errorMessage);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const loadActiveExecutions = async (): Promise<void> => {
    try {
      setIsLoading(true);
      const activeExecutions = await chainExecutionService.getActiveExecutions(chainId);
      setExecutions(activeExecutions);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load active executions';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadActiveExecutions();
  }, [chainId]);

  return {
    executions,
    isLoading,
    error,
    startExecution,
    getExecution,
    loadActiveExecutions
  };
};
