
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle, AlertCircle, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { checkLeadsAssignability } from "@/services/leadAssignabilityService";
import LeadAssignmentWithExclusions from "./LeadAssignmentWithExclusions";

interface VerificationState {
  status: 'initial' | 'verifying' | 'completed' | 'error';
  totalChecked: number;
  updated: number;
  availableLeads: number;
}

const LeadAssignmentVerificationWrapper = () => {
  const [verification, setVerification] = useState<VerificationState>({
    status: 'initial',
    totalChecked: 0,
    updated: 0,
    availableLeads: 0
  });

  const performVerification = async () => {
    setVerification(prev => ({ ...prev, status: 'verifying' }));
    
    try {
      console.log("Avvio verifica completa dell'assegnabilità...");
      
      const result = await checkLeadsAssignability();
      
      console.log("Verifica completata:", result);
      
      setVerification({
        status: 'completed',
        totalChecked: result.totalChecked,
        updated: result.updated,
        availableLeads: result.availableLeads
      });
      
      if (result.updated > 0) {
        toast.success(`Verifica completata: aggiornati ${result.updated} lead su ${result.totalChecked} controllati`);
      } else {
        toast.success(`Verifica completata: tutti i ${result.totalChecked} lead erano già aggiornati`);
      }
      
    } catch (error) {
      console.error("Errore durante la verifica:", error);
      setVerification(prev => ({ ...prev, status: 'error' }));
      toast.error("Errore durante la verifica dell'assegnabilità");
    }
  };

  const resetVerification = () => {
    setVerification({
      status: 'initial',
      totalChecked: 0,
      updated: 0,
      availableLeads: 0
    });
  };

  // Auto-start verification on component mount
  useEffect(() => {
    performVerification();
  }, []);

  if (verification.status === 'verifying') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-xl flex items-center justify-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            Verifica Assegnabilità in Corso
          </CardTitle>
          <CardDescription>
            Controllo completo del database per garantire assegnazioni corrette...
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-primary/10 p-6 rounded-lg border border-primary/30">
            <div className="flex items-center justify-center mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
            <p className="text-foreground font-medium mb-2">
              Verifica in corso...
            </p>
            <p className="text-blue-600 text-sm">
              Sto controllando tutti i lead per garantire che l'assegnabilità sia corretta.
              <br />
              Questo processo assicura che non ci siano errori nelle assegnazioni.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (verification.status === 'error') {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-xl flex items-center justify-center gap-2 text-red-600">
            <AlertCircle className="h-6 w-6" />
            Errore nella Verifica
          </CardTitle>
          <CardDescription>
            Si è verificato un errore durante la verifica dell'assegnabilità
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="bg-destructive/10 p-6 rounded-lg border border-destructive/30">
            <p className="text-destructive font-medium mb-2">
              Impossibile completare la verifica
            </p>
            <p className="text-red-600 text-sm mb-4">
              Si è verificato un errore durante il controllo del database.
              Riprova o contatta il supporto se il problema persiste.
            </p>
            <Button 
              onClick={performVerification}
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Riprova Verifica
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (verification.status === 'completed') {
    return (
      <div className="space-y-6">
        {/* Risultati della verifica */}
        <Card className="bg-green-500/10 border-green-500/30">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2 text-green-400">
              <CheckCircle className="h-5 w-5" />
              Verifica Completata con Successo
            </CardTitle>
            <CardDescription className="text-green-700">
              Il database è stato verificato e tutti i lead sono correttamente classificati
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-card p-4 rounded-lg border border-green-500/30">
                <div className="text-2xl font-bold text-green-400">
                  {verification.totalChecked}
                </div>
                <div className="text-sm text-green-600">Lead verificati</div>
              </div>
              <div className="bg-card p-4 rounded-lg border border-green-500/30">
                <div className="text-2xl font-bold text-green-400">
                  {verification.updated}
                </div>
                <div className="text-sm text-green-600">Lead aggiornati</div>
              </div>
              <div className="bg-card p-4 rounded-lg border border-green-500/30">
                <div className="text-2xl font-bold text-green-400">
                  {verification.availableLeads}
                </div>
                <div className="text-sm text-green-600">Lead assegnabili</div>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                onClick={resetVerification}
                variant="outline"
                size="sm"
                className="border-green-500/50 text-green-400 hover:bg-green-500/15"
              >
                <RefreshCcw className="h-4 w-4 mr-2" />
                Riverifica
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tool di assegnazione */}
        <LeadAssignmentWithExclusions />
      </div>
    );
  }

  // Stato initial (non dovrebbe mai essere raggiunto perché auto-start)
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">
          Verifica Assegnabilità Lead
        </CardTitle>
        <CardDescription>
          Prima di procedere con l'assegnazione, verifichiamo l'integrità del database
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button onClick={performVerification} className="w-full">
          <CheckCircle className="h-4 w-4 mr-2" />
          Avvia Verifica
        </Button>
      </CardContent>
    </Card>
  );
};

export default LeadAssignmentVerificationWrapper;
