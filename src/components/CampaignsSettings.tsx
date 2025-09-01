import { CardContent } from '@/components/ui/card';
import { useCampaignsData } from '@/hooks/useCampaignsData';
import AddCampaignForm from './campaigns/AddCampaignForm';
import CampaignsList from './campaigns/CampaignsList';

const CampaignsSettings = () => {
  const { campaigns, isLoading, addCampaign, updateCampaign, deleteCampaign } = useCampaignsData();

  if (isLoading) {
    return <div className="flex justify-center p-8">Caricamento campagne...</div>;
  }

  return (
    <CardContent className="space-y-6">
      <AddCampaignForm onSubmit={addCampaign} />
      <CampaignsList 
        campaigns={campaigns} 
        onUpdate={updateCampaign}
        onDelete={deleteCampaign}
      />
    </CardContent>
  );
};

export default CampaignsSettings;