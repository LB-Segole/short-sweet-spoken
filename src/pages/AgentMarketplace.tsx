
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgentTemplateCard } from '@/components/Marketplace/AgentTemplateCard';
import { Search, Filter, TrendingUp, Star, Download } from 'lucide-react';

export const AgentMarketplace: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Mock data - replace with actual data fetching
  const mockTemplates = [
    {
      id: '1',
      name: 'Customer Service Pro',
      description: 'Advanced customer service agent with sentiment analysis and escalation handling',
      category: 'Customer Service',
      tags: ['customer-service', 'sentiment-analysis', 'escalation'],
      created_by: 'user-1',
      creator_name: 'Sarah Wilson',
      is_public: true,
      downloads_count: 1247,
      rating_average: 4.8,
      rating_count: 156,
      version: '2.1.0',
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: '2',
      name: 'Sales Qualifier Bot',
      description: 'Lead qualification agent that scores prospects and schedules meetings',
      category: 'Sales',
      tags: ['sales', 'lead-qualification', 'scheduling'],
      created_by: 'user-2',
      creator_name: 'Mike Chen',
      is_public: true,
      downloads_count: 892,
      rating_average: 4.6,
      rating_count: 89,
      version: '1.5.0',
      created_at: '2024-01-10T00:00:00Z'
    },
    {
      id: '3',
      name: 'Healthcare Assistant',
      description: 'HIPAA-compliant healthcare assistant for appointment scheduling and basic triage',
      category: 'Healthcare',
      tags: ['healthcare', 'hipaa', 'appointments', 'triage'],
      created_by: 'user-3',
      creator_name: 'Dr. Emily Johnson',
      is_public: true,
      downloads_count: 534,
      rating_average: 4.9,
      rating_count: 67,
      version: '1.0.0',
      created_at: '2024-01-05T00:00:00Z'
    }
  ];

  const categories = ['all', 'Customer Service', 'Sales', 'Healthcare', 'Education', 'Finance'];

  const filteredTemplates = mockTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleInstall = (template: any) => {
    console.log('Installing template:', template);
  };

  const handlePreview = (template: any) => {
    console.log('Previewing template:', template);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Marketplace</h1>
          <p className="text-gray-600">Discover and install pre-built agent templates</p>
        </div>
        <Button>
          <Download className="w-4 h-4 mr-2" />
          Publish Template
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">2,453</div>
                <div className="text-sm text-gray-600">Total Templates</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">15,680</div>
                <div className="text-sm text-gray-600">Total Downloads</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold">4.7</div>
                <div className="text-sm text-gray-600">Average Rating</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="browse" className="space-y-4">
        <TabsList>
          <TabsTrigger value="browse">Browse Templates</TabsTrigger>
          <TabsTrigger value="installed">My Templates</TabsTrigger>
          <TabsTrigger value="favorites">Favorites</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4">
          {/* Search and Filters */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
            </div>
          </div>

          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto">
            {categories.map(category => (
              <Badge
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                className="cursor-pointer whitespace-nowrap"
                onClick={() => setSelectedCategory(category)}
              >
                {category === 'all' ? 'All Categories' : category}
              </Badge>
            ))}
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map(template => (
              <AgentTemplateCard
                key={template.id}
                template={template}
                onInstall={handleInstall}
                onPreview={handlePreview}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="installed">
          <Card>
            <CardHeader>
              <CardTitle>Installed Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Your installed agent templates will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="favorites">
          <Card>
            <CardHeader>
              <CardTitle>Favorite Templates</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Your favorite agent templates will appear here.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
