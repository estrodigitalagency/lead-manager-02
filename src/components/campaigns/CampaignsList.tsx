import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Pencil, Trash2, Copy } from 'lucide-react';
import { Campaign } from '@/hooks/useCampaignsData';
import { getUniqueSourcesFromLeads } from '@/services/databaseService';
import { supabase } from '@/integrations/supabase/client';
import { useMarket } from '@/contexts/MarketContext';
import CampaignSourcesConfig from './CampaignSourcesConfig';
import CampaignBypassConfig from './CampaignBypassConfig';
import CampaignNewLeadsConfig from './CampaignNewLeadsConfig';

interface CampaignsListProps {
  campaigns: Campaign[];
  onUpdate: (id: string, updates: Partial<Campaign>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onDuplicate?: (data: {
    nome: string;
    descrizione?: string;
    fonti_incluse?: string[];
    fonti_escluse?: string[];
    source_mode?: 'exclude' | 'include';
    exclude_from_included?: string[];
    bypass_time_interval?: boolean;
    solo_lead_nuovi_enabled?: boolean;
    solo_lead_nuovi_giorni?: number | null;
    solo_lead_nuovi_da_data?: string | null;
    solo_lead_nuovi_direzione?: 'newer' | 'older';
  }) => Promise<void>;
}

const CampaignsList = ({ campaigns, onUpdate, onDelete, onDuplicate }: CampaignsListProps) => {
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
  const [editSoloLeadNuoviEnabled, setEditSoloLeadNuoviEnabled] = useState(false);
  const [editSoloLeadNuoviGiorni, setEditSoloLeadNuoviGiorni] = useState<number | null>(7);
  const [editSoloLeadNuoviDaData, setEditSoloLeadNuoviDaData] = useState<string | null>(null);
  const [editSoloLeadNuoviDirezione, setEditSoloLeadNuoviDirezione] = useState<'newer' | 'older'>('newer');

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
    setEditSoloLeadNuoviEnabled(campaign.solo_lead_nuovi_enabled || false);
    setEditSoloLeadNuoviGiorni(campaign.solo_lead_nuovi_giorni ?? 7);
    setEditSoloLeadNuoviDaData(campaign.solo_lead_nuovi_da_data || null);
    setEditSoloLeadNuoviDirezione(campaign.solo_lead_nuovi_direzione || 'newer');
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
        bypass_time_interval: editBypassTimeInterval,
        solo_lead_nuovi_enabled: editSoloLeadNuoviEnabled,
        solo_lead_nuovi_giorni: editSoloLeadNuoviEnabled ? editSoloLeadNuoviGiorni : null,
        solo_lead_nuovi_da_data: editSoloLeadNuoviEnabled ? editSoloLeadNuoviDaData : null,
        solo_lead_nuovi_direzione: editSoloLeadNuoviDirezione
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

  const handleDuplicate = async (campaign: Campaign) => {
    if (!onDuplicate) return;
    // Build unique copy name: "<nome> (Copia)" or "<nome> (Copia N)" if conflict
    const baseName = `${campaign.nome} (Copia)`;
    const existing = new Set(campaigns.map(c => c.nome));
    let newName = baseName;
    let i = 2;
    while (existing.has(newName)) {
      newName = `${campaign.nome} (Copia ${i})`;
      i++;
    }
    await onDuplicate({
      nome: newName,
      descrizione: campaign.descrizione,
      fonti_incluse: campaign.fonti_incluse,
      fonti_escluse: campaign.fonti_escluse,
      source_mode: campaign.source_mode,
      exclude_from_included: campaign.exclude_from_included,
      bypass_time_interval: campaign.bypass_time_interval,
      solo_lead_nuovi_enabled: campaign.solo_lead_nuovi_enabled,
      solo_lead_nuovi_giorni: campaign.solo_lead_nuovi_giorni,
      solo_lead_nuovi_da_data: campaign.solo_lead_nuovi_da_data,
      solo_lead_nuovi_direzione: campaign.solo_lead_nuovi_direzione
    });
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

                        <CampaignNewLeadsConfig
                          enabled={editSoloLeadNuoviEnabled}
                          giorni={editSoloLeadNuoviGiorni}
                          daData={editSoloLeadNuoviDaData}
                          direzione={editSoloLeadNuoviDirezione}
                          onChange={({ enabled, giorni, daData, direzione }) => {
                            setEditSoloLeadNuoviEnabled(enabled);
                            setEditSoloLeadNuoviGiorni(giorni);
                            setEditSoloLeadNuoviDaData(daData);
                            setEditSoloLeadNuoviDirezione(direzione);
                          }}
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

                  {onDuplicate && (
                    <Button
                      variant="outline"
                      size="sm"
                      title="Duplica campagna"
                      onClick={() => handleDuplicate(campaign)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    title="Elimina campagna"
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