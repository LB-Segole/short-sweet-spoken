
import { IntegrationMarketplace } from '@/components/AgentFlow/IntegrationMarketplace';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const IntegrationsPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/voice-agents')}
              className="flex items-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Agents
            </Button>
            <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
          </div>
        </div>
      </header>

      <IntegrationMarketplace />
    </div>
  );
};

export default IntegrationsPage;
