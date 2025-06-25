
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Plus, Star, TrendingUp, Clock, Users } from 'lucide-react';
import { TemplateCard } from '@/components/AgentMarketplace/TemplateCard';
import { TemplateRatingDialog } from '@/components/AgentMarketplace/TemplateRatingDialog';
import { useAgentTemplates } from '@/hooks/useAgentTemplates';
import { useToast } from '@/hooks/use-toast';

export const AgentMarketplace: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('downloads');
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  
  const {
    templates,
    isLoading,
    loadTemplates,
    downloadTemplate,
    rateTemplate
  } = useAgentTemplates();

  const { toast } = useToast();

  const categories = [
    'Customer Service',
    'Sales',
    'Support',
    'Marketing',
    'HR',
    'Finance',
    'General'
  ];

  const handleSearch = () => {
    loadTemplates(selectedCategory, searchTerm);
  };

  const handleDownload = async (template: any) => {
    const result = await downloadTemplate(template.id);
    
    if (result) {
      // Here you would typically create a new assistant from the template
      toast({
        title: "Template Downloaded",
        description: `${template.name} has been added to your agents`,
      });
    }
  };

  const handleRate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setShowRatingDialog(true);
  };

  const handleSubmitRating = async (templateId: string, rating: number, reviewText?: string) => {
    await rateTemplate(templateId, rating, reviewText);
  };

  const featuredTemplates = templates.slice(0, 3);
  const popularTemplates = templates.filter(t => t.downloads_count > 100);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Marketplace</h1>
          <p className="text-gray-600">Discover and download pre-built agent templates</p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Publish Template
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="downloads">Most Downloaded</SelectItem>
                <SelectItem value="rating">Highest Rated</SelectItem>
                <SelectItem value="recent">Most Recent</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={handleSearch}>
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs */}
      <Tabs defaultValue="browse" className="space-y-6">
        <TabsList>
          <TabsTrigger value="browse">Browse All</TabsTrigger>
          <TabsTrigger value="featured">Featured</TabsTrigger>
          <TabsTrigger value="popular">Popular</TabsTrigger>
          <TabsTrigger value="recent">Recently Added</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <div>
                    <div className="text-2xl font-bold">{templates.length}</div>
                    <div className="text-sm text-gray-600">Total Templates</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold">{categories.length}</div>
                    <div className="text-sm text-gray-600">Categories</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <div>
                    <div className="text-2xl font-bold">4.8</div>
                    <div className="text-sm text-gray-600">Avg Rating</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-purple-500" />
                  <div>
                    <div className="text-2xl font-bold">12</div>
                    <div className="text-sm text-gray-600">New This Week</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Templates Grid */}
          {isLoading ? (
            <div className="text-center py-8">Loading templates...</div>
          ) : templates.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No templates found
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onDownload={handleDownload}
                  onRate={handleRate}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="featured" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onDownload={handleDownload}
                onRate={handleRate}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="popular" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onDownload={handleDownload}
                onRate={handleRate}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recent" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 9)
              .map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onDownload={handleDownload}
                  onRate={handleRate}
                />
              ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Rating Dialog */}
      <TemplateRatingDialog
        open={showRatingDialog}
        onOpenChange={setShowRatingDialog}
        templateId={selectedTemplateId}
        onSubmit={handleSubmitRating}
      />
    </div>
  );
};
