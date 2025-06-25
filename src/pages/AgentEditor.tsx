
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AgentEditor = () => {
  const { agentId } = useParams<{ agentId: string }>();

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Agent Editor</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Editing agent: {agentId}</p>
            <p>Agent editor functionality coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AgentEditor;
