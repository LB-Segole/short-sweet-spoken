
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone } from 'lucide-react';

const Calls = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">Calls</h1>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Call Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Manage your voice AI calls and view detailed analytics.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Calls;
