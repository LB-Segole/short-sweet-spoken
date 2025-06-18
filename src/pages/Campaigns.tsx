
import CampaignForm from '@/components/CallCenter/CampaignForm';

const Campaigns = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Campaigns</h1>
        <p className="text-gray-600">Create and manage your voice AI campaigns</p>
      </div>
      
      <div className="grid gap-8">
        <CampaignForm />
      </div>
    </div>
  );
};

export default Campaigns;
