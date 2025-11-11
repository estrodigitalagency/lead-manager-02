import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2 } from 'lucide-react';
import { Campaign } from '@/hooks/useCampaignsData';
import { getUniqueSourcesFromLeads } from '@/services/databaseService';
import { supabase } from '@/integrations/supabase/client';
import { useMarket } from '@/contexts/MarketContext';
import CampaignSourcesConfig from './CampaignSourcesConfig';
import CampaignBypassConfig from './CampaignBypassConfig';

interface CampaignsListProps {
  campaigns: Campaign[];
  onUpdate: (id: string, updates: Partial<Campaign>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const CampaignsList = ({ campaigns, onUpdate, onDelete }: CampaignsListProps) => {
  const { selectedMarket } = useMarket();
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editDescrizione, setEditDescrizione] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uniqueSources, setUniqueSources] = useState<string[]>([]);
  const [editExcludedSources, setEditExcludedSources] = useState<string[]>([]);
  const [editIncludedSources, setEditIncludedSources] = useState<string[]>([]);
  const [editExcludeFromIncluded, setEditExcludeFromIncluded] = useState<string[]>([]);
  const [editSourceMode, setEditSourceMode] = useState<'exclude' | 'include'>('exclude');
  const [editBypassTimeInterval, setEditBypassTimeInterval] = useState(false);

  useEffect(() => {
    loadUniqueSources();
  }, [selectedMarket]);

  useEffect(() => {
    const channel = supabase
      .channel('rt-unique-sources-campaigns-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lead_generation', filter: `market=eq.${selectedMarket}` }, () => {
        loadUniqueSources();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedMarket]);
const loadUniqueSources = async () => {
  try {
    const sources = await getUniqueSourcesFromLeads(selectedMarket);
    setUniqueSources(sources);
  } catch (error) {
    console.error('Error loading sources:', error);
  }
};

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setEditNome(campaign.nome);
    setEditDescrizione(campaign.descrizione || '');
    setEditExcludedSources(campaign.fonti_escluse || []);
    setEditIncludedSources(campaign.fonti_incluse || []);
    setEditExcludeFromIncluded(campaign.exclude_from_included || []);
    setEditSourceMode(campaign.source_mode || 'exclude');
    setEditBypassTimeInterval(campaign.bypass_time_interval || false);
  };

  const handleUpdate = async () => {
    if (!editingCampaign || !editNome.trim()) return;

    setIsSubmitting(true);
    try {
      await onUpdate(editingCampaign.id, {
        nome: editNome.trim(),
        descrizione: editDescrizione.trim() || undefined,
        fonti_incluse: editIncludedSources.length > 0 ? editIncludedSources : [],
        fonti_escluse: editExcludedSources.length > 0 ? editExcludedSources : [],
        source_mode: editSourceMode,
        exclude_from_included: editExcludeFromIncluded.length > 0 ? editExcludeFromIncluded : [],
        bypass_time_interval: editBypassTimeInterval
      });
      setEditingCampaign(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addEditExcludedSource = (source: string) => {
    setEditExcludedSources(prev => [...prev, source]);
  };

  const removeEditExcludedSource = (source: string) => {
    setEditExcludedSources(prev => prev.filter(s => s !== source));
  };

  const addEditIncludedSource = (source: string) => {
    setEditIncludedSources(prev => [...prev, source]);
  };

  const removeEditIncludedSource = (source: string) => {
    setEditIncludedSources(prev => prev.filter(s => s !== source));
  };

  const addEditExcludeFromIncluded = (source: string) => {
    setEditExcludeFromIncluded(prev => [...prev, source]);
  };

  const removeEditExcludeFromIncluded = (source: string) => {
    setEditExcludeFromIncluded(prev => prev.filter(s => s !== source));
  };

  const toggleEditSourceMode = (mode: 'exclude' | 'include') => {
    setEditSourceMode(mode);
    setEditExcludedSources([]);
    setEditIncludedSources([]);
    setEditExcludeFromIncluded([]);
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

                  {/* Show configured sources */}
                  {((campaign.fonti_escluse && campaign.fonti_escluse.length > 0) || 
                    (campaign.fonti_incluse && campaign.fonti_incluse.length > 0) ||
                    campaign.bypass_time_interval) && (
                    <div className="mb-3">
                      <p className="text-xs text-muted-foreground mb-1">Configurazioni:</p>
                      <div className="flex flex-wrap gap-1">
                        {campaign.source_mode === 'exclude' && campaign.fonti_escluse?.map((fonte) => (
                          <Badge key={fonte} variant="secondary" className="text-xs">
                            Esclusa: {fonte}
                          </Badge>
                        ))}
                        {campaign.source_mode === 'include' && campaign.fonti_incluse?.map((fonte) => (
                          <Badge key={fonte} variant="default" className="text-xs">
                            Inclusa: {fonte}
                          </Badge>
                        ))}
                        {campaign.bypass_time_interval && (
                          <Badge variant="outline" className="text-xs">
                            Bypass Temporale
                          </Badge>
                        )}
                      </div>
                    </div>
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
                        
                        <CampaignSourcesConfig
                          uniqueSources={uniqueSources}
                          excludedSources={editExcludedSources}
                          includedSources={editIncludedSources}
                          excludeFromIncluded={editExcludeFromIncluded}
                          sourceMode={editSourceMode}
                          onAddExcludedSource={addEditExcludedSource}
                          onRemoveExcludedSource={removeEditExcludedSource}
                          onAddIncludedSource={addEditIncludedSource}
                          onRemoveIncludedSource={removeEditIncludedSource}
                          onAddExcludeFromIncluded={addEditExcludeFromIncluded}
                          onRemoveExcludeFromIncluded={removeEditExcludeFromIncluded}
                          onToggleSourceMode={toggleEditSourceMode}
                          onRefreshSources={loadUniqueSources}
                        />
                        
                        <CampaignBypassConfig
                          bypassTimeInterval={editBypassTimeInterval}
                          onToggleBypass={setEditBypassTimeInterval}
                        />
                        
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