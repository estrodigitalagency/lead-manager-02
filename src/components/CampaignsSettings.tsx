import { useCampaignsData } from '@/hooks/useCampaignsData';
import AddCampaignForm from './campaigns/AddCampaignForm';
import CampaignsList from './campaigns/CampaignsList';

const CampaignsSettings = () => {
  const { campaigns, isLoading, addCampaign, updateCampaign, deleteCampaign } = useCampaignsData();

  if (isLoading) {
    return <div className="flex justify-center p-8 text-sm text-muted-foreground">Caricamento campagne...</div>;
  }

  return (
    <div className="space-y-4 min-w-0">
      <AddCampaignForm onSubmit={addCampaign} />
      <CampaignsList
        campaigns={campaigns}
        onUpdate={updateCampaign}
        onDelete={deleteCampaign}
        onDuplicate={addCampaign}
      />
    </div>
  );
};

export default CampaignsSettings;