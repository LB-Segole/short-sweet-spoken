
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Star, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { TemplateRatingDialog } from '@/components/AgentMarketplace/TemplateRatingDialog';

interface AgentTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  template_data: any;
  created_by: string;
  team_id: string | null;
  is_public: boolean;
  downloads_count: number | null;
  rating_average: number | null;
  rating_count: number | null;
  created_at: string;
  updated_at: string;
  version: string | null;
  tags: string[] | null;
}

interface FilterState {
  searchTerm: string;
  category: string;
  sortBy: string;
}

const AgentMarketplace = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterState>({
    searchTerm: '',
    category: 'all',
    sortBy: 'newest',
  });
  const [categories, setCategories] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [showRatingDialog, setShowRatingDialog] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates();
    fetchCategories();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('agent_templates')
        .select('*')
        .eq('is_public', true);

      if (filter.searchTerm) {
        query = query.ilike('name', `%${filter.searchTerm}%`);
      }

      if (filter.category !== 'all') {
        query = query.eq('category', filter.category);
      }

      if (filter.sortBy === 'topRated') {
        query = query.order('rating_average', { ascending: false, nullsFirst: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;

      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_templates')
        .select('category')
        .eq('is_public', true);

      if (error) throw error;

      const uniqueCategories = ['all', ...new Set(data?.map(item => item.category) || [])];
      setCategories(uniqueCategories);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    }
  };

  const handleFilterChange = (newFilter: Partial<FilterState>) => {
    setFilter({ ...filter, ...newFilter });
  };

  useEffect(() => {
    fetchTemplates();
  }, [filter]);

  const handleRating = async (templateId: string, rating: number, reviewText?: string): Promise<boolean> => {
    if (!user) {
      toast.error('Please sign in to rate templates');
      return false;
    }

    try {
      const { error } = await supabase
        .from('template_reviews')
        .upsert({
          template_id: templateId,
          user_id: user.id,
          rating,
          review_text: reviewText
        });

      if (error) throw error;

      toast.success('Rating submitted successfully!');
      
      // Refresh templates to show updated rating
      const updatedTemplates = templates.map(template => {
        if (template.id === templateId) {
          return {
            ...template,
            rating_count: (template.rating_count || 0) + 1,
            rating_average: ((template.rating_average || 0) * (template.rating_count || 0) + rating) / ((template.rating_count || 0) + 1)
          };
        }
        return template;
      });
      setTemplates(updatedTemplates);
      return true;
    } catch (error) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
      return false;
    }
  };

  const TemplateCard = ({ template }: { template: AgentTemplate }) => {
    return (
      <Card className="bg-white shadow-md rounded-lg overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-semibold">{template.name}</CardTitle>
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-normal">
            {template.category}
          </Badge>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-gray-600 text-sm mb-4">{template.description}</p>
          <div className="flex items-center space-x-2 mb-3">
            <Star className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-gray-700">
              {template.rating_average ? template.rating_average.toFixed(1) : 'No ratings'}
            </span>
            {template.rating_count && (
              <span className="text-gray-500 text-xs"> ({template.rating_count} ratings)</span>
            )}
          </div>
          <div className="flex justify-between">
            <Button variant="outline" size="sm" onClick={() => setShowDetails(template.id)}>
              <Zap className="w-4 h-4 mr-2" />
              View Details
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRatingDialog(template.id)}
            >
              <Star className="w-4 h-4 mr-2" />
              Rate
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  const TemplateDetailsDialog = ({ template, onClose }: { template: AgentTemplate; onClose: () => void }) => {
    const templateData = template.template_data || {};
    const systemPrompt = templateData.system_prompt || 'No system prompt available';
    const exampleCalls = templateData.example_calls || [];

    return (
      <Dialog open={showDetails === template.id} onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {template.name}
              <Button variant="ghost" size="icon" onClick={onClose}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Description</h3>
                <p className="text-gray-600">{template.description}</p>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">System Prompt</h3>
                <p className="text-gray-600">{systemPrompt}</p>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">Example Calls</h3>
              <ul className="list-disc pl-5">
                {exampleCalls.map((call: string, index: number) => (
                  <li key={index} className="text-gray-600">{call}</li>
                ))}
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Loading templates...</div>;
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/dashboard')} className="mr-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold text-gray-800">Agent Template Marketplace</h1>
        <div className="space-x-4 flex items-center">
          <Input
            type="search"
            placeholder="Search templates..."
            className="md:w-64"
            value={filter.searchTerm}
            onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
          />
          <Select value={filter.category} onValueChange={(value) => handleFilterChange({ category: value })}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filter.sortBy} onValueChange={(value) => handleFilterChange({ sortBy: value })}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="topRated">Top Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>

      {templates.filter(template => template.id === showDetails).map(template => (
        <TemplateDetailsDialog
          key={template.id}
          template={template}
          onClose={() => setShowDetails(null)}
        />
      ))}

      {showRatingDialog && (
        <TemplateRatingDialog
          open={!!showRatingDialog}
          onOpenChange={(open) => !open && setShowRatingDialog(null)}
          templateId={showRatingDialog}
          templateName={templates.find(t => t.id === showRatingDialog)?.name}
          onSubmit={handleRating}
        />
      )}
    </div>
  );
};

export default AgentMarketplace;
