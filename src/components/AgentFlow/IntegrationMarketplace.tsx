
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Star, 
  Download, 
  Zap, 
  Database, 
  MessageSquare, 
  Mail,
  Users,
  Calendar
} from 'lucide-react';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: React.ReactNode;
  rating: number;
  installs: number;
  tags: string[];
  isPremium: boolean;
  isInstalled: boolean;
  config: {
    fields: Array<{
      name: string;
      type: 'text' | 'password' | 'url' | 'select';
      required: boolean;
      options?: string[];
    }>;
  };
}

const integrations: Integration[] = [
  {
    id: 'salesforce',
    name: 'Salesforce CRM',
    description: 'Connect to Salesforce to create leads, update contacts, and sync customer data',
    category: 'CRM',
    icon: <Users className="w-5 h-5" />,
    rating: 4.8,
    installs: 1250,
    tags: ['CRM', 'Sales', 'Lead Generation'],
    isPremium: true,
    isInstalled: false,
    config: {
      fields: [
        { name: 'client_id', type: 'text', required: true },
        { name: 'client_secret', type: 'password', required: true },
        { name: 'instance_url', type: 'url', required: true },
      ]
    }
  },
  {
    id: 'webhook',
    name: 'Generic Webhook',
    description: 'Send HTTP requests to any webhook endpoint with custom headers and data',
    category: 'API',
    icon: <Zap className="w-5 h-5" />,
    rating: 4.9,
    installs: 2100,
    tags: ['Webhook', 'HTTP', 'API'],
    isPremium: false,
    isInstalled: true,
    config: {
      fields: [
        { name: 'endpoint_url', type: 'url', required: true },
        { name: 'method', type: 'select', required: true, options: ['POST', 'PUT', 'PATCH'] },
        { name: 'auth_token', type: 'password', required: false },
      ]
    }
  },
  {
    id: 'slack',
    name: 'Slack Notifications',
    description: 'Send messages to Slack channels and users',
    category: 'Communication',
    icon: <MessageSquare className="w-5 h-5" />,
    rating: 4.7,
    installs: 890,
    tags: ['Slack', 'Notifications', 'Team Communication'],
    isPremium: false,
    isInstalled: false,
    config: {
      fields: [
        { name: 'bot_token', type: 'password', required: true },
        { name: 'channel', type: 'text', required: true },
      ]
    }
  },
  {
    id: 'gmail',
    name: 'Gmail Integration',
    description: 'Send emails via Gmail API with attachments and templates',
    category: 'Communication',
    icon: <Mail className="w-5 h-5" />,
    rating: 4.6,
    installs: 756,
    tags: ['Email', 'Gmail', 'Notifications'],
    isPremium: false,
    isInstalled: false,
    config: {
      fields: [
        { name: 'client_id', type: 'text', required: true },
        { name: 'client_secret', type: 'password', required: true },
      ]
    }
  },
  {
    id: 'postgresql',
    name: 'PostgreSQL Database',
    description: 'Query and update PostgreSQL databases directly from your flows',
    category: 'Database',
    icon: <Database className="w-5 h-5" />,
    rating: 4.5,
    installs: 445,
    tags: ['Database', 'PostgreSQL', 'SQL'],
    isPremium: true,
    isInstalled: false,
    config: {
      fields: [
        { name: 'connection_string', type: 'password', required: true },
        { name: 'database_name', type: 'text', required: true },
      ]
    }
  },
  {
    id: 'calendly',
    name: 'Calendly Scheduling',
    description: 'Book appointments and check availability via Calendly API',
    category: 'Scheduling',
    icon: <Calendar className="w-5 h-5" />,
    rating: 4.4,
    installs: 320,
    tags: ['Scheduling', 'Calendar', 'Appointments'],
    isPremium: false,
    isInstalled: false,
    config: {
      fields: [
        { name: 'api_token', type: 'password', required: true },
        { name: 'user_uri', type: 'text', required: true },
      ]
    }
  },
];

export const IntegrationMarketplace: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);

  const categories = ['all', 'CRM', 'API', 'Communication', 'Database', 'Scheduling'];

  const filteredIntegrations = integrations.filter(integration => {
    const matchesSearch = integration.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         integration.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || integration.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleInstall = (integration: Integration) => {
    setSelectedIntegration(integration);
  };

  const handleConfigure = (integration: Integration, config: Record<string, string>) => {
    console.log('Configuring integration:', integration.id, config);
    // Here you would save the configuration to your backend
    setSelectedIntegration(null);
  };

  return (
    <div className="h-full flex">
      <div className="flex-1 p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Integration Marketplace</h2>
          <p className="text-gray-600">Connect your agents to external services and APIs</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search integrations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList>
              {categories.map(category => (
                <TabsTrigger key={category} value={category} className="capitalize">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        {/* Integration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIntegrations.map((integration) => (
            <Card key={integration.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      {integration.icon}
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{integration.category}</Badge>
                        {integration.isPremium && (
                          <Badge className="bg-yellow-100 text-yellow-800">Premium</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-600 line-clamp-2">
                  {integration.description}
                </p>
                
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{integration.rating}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="w-4 h-4" />
                    <span>{integration.installs}</span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {integration.tags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
                
                <Button
                  onClick={() => handleInstall(integration)}
                  disabled={integration.isInstalled}
                  className="w-full"
                  variant={integration.isInstalled ? "outline" : "default"}
                >
                  {integration.isInstalled ? 'Installed' : 'Install'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Configuration Panel */}
      {selectedIntegration && (
        <IntegrationConfigPanel
          integration={selectedIntegration}
          onClose={() => setSelectedIntegration(null)}
          onConfigure={handleConfigure}
        />
      )}
    </div>
  );
};

interface IntegrationConfigPanelProps {
  integration: Integration;
  onClose: () => void;
  onConfigure: (integration: Integration, config: Record<string, string>) => void;
}

const IntegrationConfigPanel: React.FC<IntegrationConfigPanelProps> = ({
  integration,
  onClose,
  onConfigure,
}) => {
  const [config, setConfig] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfigure(integration, config);
  };

  return (
    <Card className="w-96 border-l">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Configure {integration.name}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ×
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {integration.config.fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <label className="text-sm font-medium capitalize">
                {field.name.replace('_', ' ')}
                {field.required && <span className="text-red-500">*</span>}
              </label>
              
              {field.type === 'select' ? (
                <select
                  value={config[field.name] || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, [field.name]: e.target.value }))}
                  className="w-full p-2 border rounded-md"
                  required={field.required}
                >
                  <option value="">Select {field.name}</option>
                  {field.options?.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              ) : (
                <Input
                  type={field.type === 'password' ? 'password' : 'text'}
                  value={config[field.name] || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, [field.name]: e.target.value }))}
                  placeholder={`Enter ${field.name}`}
                  required={field.required}
                />
              )}
            </div>
          ))}
          
          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              Install & Configure
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
