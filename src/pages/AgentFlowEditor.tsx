
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FlowEditorWrapper } from '@/components/AgentFlow/FlowEditor';
import { AgentFlow } from '@/types/agentFlow';
import { ArrowLeft, Save, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const AgentFlowEditor = () => {
  const navigate = useNavigate();
  const { flowId } = useParams();
  const { toast } = useToast();
  const [flow, setFlow] = useState<AgentFlow | undefined>(undefined);
  const [showSettings, setShowSettings] = useState(false);
  const [flowName, setFlowName] = useState('');
  const [flowDescription, setFlowDescription] = useState('');

  useEffect(() => {
    if (flowId && flowId !== 'new') {
      // Load existing flow
      console.log('Loading flow:', flowId);
    } else {
      // Create new flow
      const newFlow: AgentFlow = {
        id: `flow-${Date.now()}`,
        name: 'New Agent Flow',
        description: '',
        nodes: [],
        edges: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: 'current-user',
        is_active: false,
      };
      setFlow(newFlow);
      setFlowName(newFlow.name);
      setFlowDescription(newFlow.description || '');
    }
  }, [flowId]);

  const handleSave = (updatedFlow: AgentFlow) => {
    // Update flow with current settings
    const finalFlow = {
      ...updatedFlow,
      name: flowName,
      description: flowDescription,
    };
    
    setFlow(finalFlow);
    
    // Save to backend
    console.log('Saving flow:', finalFlow);
    
    toast({
      title: "Flow Saved",
      description: "Your agent flow has been saved successfully.",
    });
  };

  const handleTest = (testFlow: AgentFlow) => {
    console.log('Testing flow:', testFlow);
    
    toast({
      title: "Flow Test Started",
      description: "Your agent flow is being tested. Check the console for details.",
    });
  };

  if (!flow) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading flow editor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/voice-agents')}
                className="flex items-center"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Agents
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{flowName}</h1>
                <p className="text-sm text-gray-500">Visual Agent Flow Editor</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-73px)]">
        {/* Settings Panel */}
        {showSettings && (
          <Card className="w-80 m-4 h-fit">
            <CardHeader>
              <CardTitle>Flow Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Flow Name
                </label>
                <Input
                  value={flowName}
                  onChange={(e) => setFlowName(e.target.value)}
                  placeholder="Enter flow name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <Textarea
                  value={flowDescription}
                  onChange={(e) => setFlowDescription(e.target.value)}
                  placeholder="Describe what this flow does"
                  rows={3}
                />
              </div>
              <Button onClick={() => setShowSettings(false)} size="sm">
                <Save className="w-4 h-4 mr-2" />
                Apply Settings
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Flow Editor */}
        <div className="flex-1 p-4">
          <Card className="h-full">
            <FlowEditorWrapper
              flow={flow}
              onSave={handleSave}
              onTest={handleTest}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AgentFlowEditor;
