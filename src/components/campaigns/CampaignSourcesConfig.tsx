import React from 'react';
import { Label } from '@/components/ui/label';
import { SourceFilter } from '@/components/lead-assignment/SourceFilter';

interface CampaignSourcesConfigProps {
  uniqueSources: string[];
  excludedSources: string[];
  includedSources: string[];
  excludeFromIncluded: string[];
  sourceMode: 'exclude' | 'include';
  onAddExcludedSource: (source: string) => void;
  onRemoveExcludedSource: (source: string) => void;
  onAddIncludedSource: (source: string) => void;
  onRemoveIncludedSource: (source: string) => void;
  onAddExcludeFromIncluded: (source: string) => void;
  onRemoveExcludeFromIncluded: (source: string) => void;
  onToggleSourceMode: (mode: 'exclude' | 'include') => void;
}

const CampaignSourcesConfig = ({
  uniqueSources,
  excludedSources,
  includedSources,
  excludeFromIncluded,
  sourceMode,
  onAddExcludedSource,
  onRemoveExcludedSource,
  onAddIncludedSource,
  onRemoveIncludedSource,
  onAddExcludeFromIncluded,
  onRemoveExcludeFromIncluded,
  onToggleSourceMode
}: CampaignSourcesConfigProps) => {
  return (
    <div className="space-y-4">
      <Label className="text-base font-semibold">Configurazione Fonti (Opzionale)</Label>
      <p className="text-sm text-muted-foreground">
        Quando selezioni questa campagna, le fonti verranno applicate automaticamente
      </p>
      
      <SourceFilter 
        uniqueSources={uniqueSources}
        excludedSources={excludedSources}
        includedSources={includedSources}
        excludeFromIncluded={excludeFromIncluded}
        sourceMode={sourceMode}
        onAddExcludedSource={onAddExcludedSource}
        onRemoveExcludedSource={onRemoveExcludedSource}
        onAddIncludedSource={onAddIncludedSource}
        onRemoveIncludedSource={onRemoveIncludedSource}
        onAddExcludeFromIncluded={onAddExcludeFromIncluded}
        onRemoveExcludeFromIncluded={onRemoveExcludeFromIncluded}
        onToggleSourceMode={onToggleSourceMode}
      />
    </div>
  );
};

export default CampaignSourcesConfig;