import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2 } from 'lucide-react';
import { Campaign } from '@/hooks/useCampaignsData';

interface CampaignsListProps {
  campaigns: Campaign[];
  onUpdate: (id: string, updates: Partial<Campaign>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const CampaignsList = ({ campaigns, onUpdate, onDelete }: CampaignsListProps) => {
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editDescrizione, setEditDescrizione] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setEditNome(campaign.nome);
    setEditDescrizione(campaign.descrizione || '');
  };

  const handleUpdate = async () => {
    if (!editingCampaign || !editNome.trim()) return;

    setIsSubmitting(true);
    try {
      await onUpdate(editingCampaign.id, {
        nome: editNome.trim(),
        descrizione: editDescrizione.trim() || undefined
      });
      setEditingCampaign(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (campaign: Campaign) => {
    await onUpdate(campaign.id, { attivo: !campaign.attivo });
  };

  const handleDelete = async (campaign: Campaign) => {
    if (window.confirm(`Sei sicuro di voler eliminare la campagna "${campaign.nome}"?`)) {
      await onDelete(campaign.id);
    }
  };

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nessuna campagna trovata. Aggiungi la prima campagna usando il form sopra.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Campagne Esistenti ({campaigns.length})</h3>
      
      <div className="grid gap-4">
        {campaigns.map((campaign) => (
          <Card key={campaign.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">{campaign.nome}</h4>
                    <Badge variant={campaign.attivo ? "default" : "secondary"}>
                      {campaign.attivo ? 'Attiva' : 'Disattivata'}
                    </Badge>
                  </div>
                  
                  {campaign.descrizione && (
                    <p className="text-sm text-muted-foreground mb-3">{campaign.descrizione}</p>
                  )}

                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={campaign.attivo}
                        onCheckedChange={() => handleToggleActive(campaign)}
                      />
                      <span className="text-sm">Attiva</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(campaign)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Modifica Campagna</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium">Nome</label>
                          <Input
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            placeholder="Nome campagna"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Descrizione</label>
                          <Textarea
                            value={editDescrizione}
                            onChange={(e) => setEditDescrizione(e.target.value)}
                            placeholder="Descrizione (opzionale)"
                            rows={3}
                          />
                        </div>
                        <Button
                          onClick={handleUpdate}
                          disabled={isSubmitting || !editNome.trim()}
                          className="w-full"
                        >
                          {isSubmitting ? 'Aggiornamento...' : 'Aggiorna Campagna'}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(campaign)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CampaignsList;