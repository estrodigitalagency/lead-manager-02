import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { getUniqueSourcesFromLeads } from '@/services/databaseService';
import { supabase } from '@/integrations/supabase/client';
import { useMarket } from '@/contexts/MarketContext';
import CampaignSourcesConfig from './CampaignSourcesConfig';
import CampaignBypassConfig from './CampaignBypassConfig';

interface AddCampaignFormProps {
  onSubmit: (data: { 
    nome: string; 
    descrizione?: string;
    fonti_incluse?: string[];
    fonti_escluse?: string[];
    source_mode?: 'exclude' | 'include';
    exclude_from_included?: string[];
    bypass_time_interval?: boolean;
  }) => Promise<void>;
}

const AddCampaignForm = ({ onSubmit }: AddCampaignFormProps) => {
  const { selectedMarket } = useMarket();
  const [nome, setNome] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uniqueSources, setUniqueSources] = useState<string[]>([]);
  const [excludedSources, setExcludedSources] = useState<string[]>([]);
  const [includedSources, setIncludedSources] = useState<string[]>([]);
  const [excludeFromIncluded, setExcludeFromIncluded] = useState<string[]>([]);
  const [sourceMode, setSourceMode] = useState<'exclude' | 'include'>('exclude');
  const [bypassTimeInterval, setBypassTimeInterval] = useState(false);

  useEffect(() => {
    loadUniqueSources();
  }, [selectedMarket]);

  useEffect(() => {
    const channel = supabase
      .channel('rt-unique-sources-add-campaign')
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

  const handleSubmit = async () => {
    if (!nome.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        nome: nome.trim(),
        descrizione: descrizione.trim() || undefined,
        fonti_incluse: includedSources.length > 0 ? includedSources : undefined,
        fonti_escluse: excludedSources.length > 0 ? excludedSources : undefined,
        source_mode: sourceMode,
        bypass_time_interval: bypassTimeInterval
      });
      setNome('');
      setDescrizione('');
      setExcludedSources([]);
      setIncludedSources([]);
      setExcludeFromIncluded([]);
      setBypassTimeInterval(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addExcludedSource = (source: string) => {
    setExcludedSources(prev => [...prev, source]);
  };

  const removeExcludedSource = (source: string) => {
    setExcludedSources(prev => prev.filter(s => s !== source));
  };

  const addIncludedSource = (source: string) => {
    setIncludedSources(prev => [...prev, source]);
  };

  const removeIncludedSource = (source: string) => {
    setIncludedSources(prev => prev.filter(s => s !== source));
  };

  const addExcludeFromIncluded = (source: string) => {
    setExcludeFromIncluded(prev => [...prev, source]);
  };

  const removeExcludeFromIncluded = (source: string) => {
    setExcludeFromIncluded(prev => prev.filter(s => s !== source));
  };

  const toggleSourceMode = (mode: 'exclude' | 'include') => {
    setSourceMode(mode);
    setExcludedSources([]);
    setIncludedSources([]);
    setExcludeFromIncluded([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aggiungi Nuova Campagna</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nome Campagna *</label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Inserisci nome campagna"
            />
          </div>
          
          <div>
            <label className="text-sm font-medium">Descrizione</label>
            <Textarea
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Inserisci descrizione (opzionale)"
              rows={3}
            />
          </div>
          
          <CampaignSourcesConfig
            uniqueSources={uniqueSources}
            excludedSources={excludedSources}
            includedSources={includedSources}
            excludeFromIncluded={excludeFromIncluded}
            sourceMode={sourceMode}
            onAddExcludedSource={addExcludedSource}
            onRemoveExcludedSource={removeExcludedSource}
            onAddIncludedSource={addIncludedSource}
            onRemoveIncludedSource={removeIncludedSource}
            onAddExcludeFromIncluded={addExcludeFromIncluded}
            onRemoveExcludeFromIncluded={removeExcludeFromIncluded}
            onToggleSourceMode={toggleSourceMode}
            onRefreshSources={loadUniqueSources}
          />
          <CampaignBypassConfig
            bypassTimeInterval={bypassTimeInterval}
            onToggleBypass={setBypassTimeInterval}
          />
          
          <Button
            onClick={handleSubmit} 
            disabled={isSubmitting || !nome.trim()}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            {isSubmitting ? 'Aggiunta in corso...' : 'Aggiungi Campagna'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AddCampaignForm;