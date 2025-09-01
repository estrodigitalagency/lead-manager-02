import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AddCampaignFormProps {
  onSubmit: (data: { nome: string; descrizione?: string }) => Promise<void>;
}

const AddCampaignForm = ({ onSubmit }: AddCampaignFormProps) => {
  const [nome, setNome] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({
        nome: nome.trim(),
        descrizione: descrizione.trim() || undefined
      });
      setNome('');
      setDescrizione('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Aggiungi Nuova Campagna</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="nome">Nome Campagna *</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Inserisci nome campagna"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="descrizione">Descrizione</Label>
            <Textarea
              id="descrizione"
              value={descrizione}
              onChange={(e) => setDescrizione(e.target.value)}
              placeholder="Inserisci descrizione (opzionale)"
              rows={3}
            />
          </div>

          <Button 
            type="submit" 
            disabled={isSubmitting || !nome.trim()}
            className="w-full"
          >
            {isSubmitting ? 'Aggiunta in corso...' : 'Aggiungi Campagna'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddCampaignForm;