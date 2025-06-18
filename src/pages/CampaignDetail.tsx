
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Phone, Users, BarChart, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import ContactUploader from '@/components/CallCenter/ContactUploader';

interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: string;
  created_at: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
}

const CampaignDetail = () => {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadCampaignData();
    }
  }, [id]);

  const loadCampaignData = async () => {
    try {
      // Load campaign details
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Load contacts for this campaign
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('campaign_id', id);

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);

    } catch (error) {
      console.error('Error loading campaign data:', error);
      toast.error('Failed to load campaign data');
    } finally {
      setLoading(false);
    }
  };

  const handleContactsUploaded = (newContacts: any[]) => {
    loadCampaignData(); // Reload to get updated contacts
    toast.success(`Added ${newContacts.length} contacts to campaign`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Loading campaign details...</div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-gray-500">Campaign not found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">{campaign.name}</h1>
          <p className="text-gray-500">{campaign.description || 'No description'}</p>
        </div>
        <Badge variant={campaign.status === 'active' ? 'default' : 'secondary'}>
          {campaign.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calls Made</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ContactUploader 
          campaignId={id} 
          onSuccess={handleContactsUploaded}
        />

        <Card>
          <CardHeader>
            <CardTitle>Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            {contacts.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No contacts yet. Upload a CSV file to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {contacts.slice(0, 10).map((contact) => (
                  <div key={contact.id} className="flex justify-between items-center p-2 border rounded">
                    <div>
                      <div className="font-medium">{contact.name}</div>
                      <div className="text-sm text-gray-500">{contact.phone}</div>
                    </div>
                    <Button variant="outline" size="sm">
                      Call
                    </Button>
                  </div>
                ))}
                {contacts.length > 10 && (
                  <div className="text-center text-gray-500 py-2">
                    ... and {contacts.length - 10} more contacts
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CampaignDetail;
