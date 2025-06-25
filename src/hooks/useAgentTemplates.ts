
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface AgentTemplate {
  id: string;
  name: string;
  description?: string;
  category: string;
  tags: string[];
  template_data: Record<string, any>;
  created_by: string;
  team_id?: string;
  is_public: boolean;
  downloads_count: number;
  rating_average: number;
  rating_count: number;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateReview {
  id: string;
  template_id: string;
  user_id: string;
  rating: number;
  review_text?: string;
  created_at: string;
}

export const useAgentTemplates = () => {
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [reviews, setReviews] = useState<TemplateReview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadTemplates = async (category?: string, searchTerm?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      let query = supabase
        .from('agent_templates')
        .select('*')
        .order('downloads_count', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      
      setTemplates(data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load templates';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createTemplate = async (templateData: {
    name: string;
    description?: string;
    category: string;
    tags: string[];
    template_data: Record<string, any>;
    is_public?: boolean;
  }): Promise<AgentTemplate | null> => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('agent_templates')
        .insert({
          ...templateData,
          created_by: user.id,
          is_public: templateData.is_public || false
        })
        .select()
        .single();

      if (error) throw error;
      
      setTemplates(prev => [data, ...prev]);
      
      toast({
        title: "Success",
        description: "Agent template created successfully",
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create template';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const downloadTemplate = async (templateId: string): Promise<AgentTemplate | null> => {
    try {
      // Get current download count first
      const { data: currentTemplate, error: fetchError } = await supabase
        .from('agent_templates')
        .select('downloads_count')
        .eq('id', templateId)
        .single();

      if (fetchError) throw fetchError;

      // Increment download count
      const { error: updateError } = await supabase
        .from('agent_templates')
        .update({ downloads_count: (currentTemplate.downloads_count || 0) + 1 })
        .eq('id', templateId);

      if (updateError) throw updateError;

      // Get the updated template
      const { data, error } = await supabase
        .from('agent_templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (error) throw error;
      
      setTemplates(prev => 
        prev.map(template => 
          template.id === templateId 
            ? { ...template, downloads_count: template.downloads_count + 1 }
            : template
        )
      );
      
      toast({
        title: "Success",
        description: "Template downloaded successfully",
      });
      
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to download template';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      return null;
    }
  };

  const rateTemplate = async (templateId: string, rating: number, reviewText?: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('template_reviews')
        .upsert({
          template_id: templateId,
          user_id: user.id,
          rating,
          review_text: reviewText
        })
        .select()
        .single();

      if (error) throw error;
      
      setReviews(prev => {
        const existingIndex = prev.findIndex(
          review => review.template_id === templateId && review.user_id === user.id
        );
        
        if (existingIndex >= 0) {
          return prev.map((review, index) => 
            index === existingIndex ? data : review
          );
        } else {
          return [data, ...prev];
        }
      });
      
      toast({
        title: "Success",
        description: "Review submitted successfully",
      });
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit review';
      setError(errorMessage);
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loadTemplateReviews = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('template_reviews')
        .select('*')
        .eq('template_id', templateId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setReviews(data || []);
    } catch (err) {
      console.error('Failed to load template reviews:', err);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  return {
    templates,
    reviews,
    isLoading,
    error,
    loadTemplates,
    createTemplate,
    downloadTemplate,
    rateTemplate,
    loadTemplateReviews
  };
};
