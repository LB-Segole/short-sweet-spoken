
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgentChainBuilder } from '@/components/AgentOrchestration/AgentChainBuilder';
import { Plus, Play, Settings, TrendingUp } from 'lucide-react';

export const AgentOrchestration: React.FC = () => {
  const [activeTab, setActiveTab] = useState('chains');
  const [showChainBuilder, setShowChainBuilder] = useState(false);

  // Mock data - replace with actual data fetching
  const availableAgents = [
    { id: '1', name: 'Customer Service Agent' },
    { id: '2', name: 'Sales Assistant' },
    { id: '3', name: 'Technical Support' },
    { id: '4', name: 'Escalation Handler' }
  ];

  const existingChains = [
    {
      id: '1',
      name: 'Customer Support Flow',
      description: 'Multi-tier customer support with escalation',
      steps: 3,
      status: 'active',
      successRate: 94
    },
    {
      id: '2', 
      name: 'Sales Qualification',
      description: 'Lead qualification and routing',
      steps: 2,
      status: 'draft',
      successRate: 89
    }
  ];

  const handleSaveChain = (chain: any) => {
    console.log('Saving chain:', chain);
    setShowChainBuilder(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Agent Orchestration</h1>
          <p className="text-gray-600">Manage multi-agent workflows and chains</p>
        </div>
        <Button onClick={() => setShowChainBuilder(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Chain
        </Button>
      </div>

      {showChainBuilder ? (
        <Card>
          <CardHeader>
            <CardTitle>Create Agent Chain</CardTitle>
          </CardHeader>
          <CardContent>
            <AgentChainBuilder
              availableAgents={availableAgents}
              onSave={handleSaveChain}
            />
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="chains">Agent Chains</TabsTrigger>
            <TabsTrigger value="executions">Executions</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="chains" className="space-y-4">
            <div className="grid gap-4">
              {existingChains.map((chain) => (
                <Card key={chain.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{chain.name}</h3>
                        <p className="text-gray-600 mb-2">{chain.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          <span>{chain.steps} steps</span>
                          <span>Success rate: {chain.successRate}%</span>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            chain.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {chain.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Settings className="w-4 h-4 mr-2" />
                          Configure
                        </Button>
                        <Button size="sm">
                          <Play className="w-4 h-4 mr-2" />
                          Test
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="executions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Executions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Recent agent chain executions will appear here.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Performance Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">Chain performance metrics and analytics will appear here.</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
