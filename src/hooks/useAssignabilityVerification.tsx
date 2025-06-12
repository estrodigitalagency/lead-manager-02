
import { useState } from "react";
import { toast } from "sonner";
import { checkLeadsAssignability } from "@/services/leadAssignabilityService";

interface VerificationState {
  status: 'initial' | 'verifying' | 'completed' | 'error';
  totalChecked: number;
  updated: number;
  availableLeads: number;
  lastVerified?: Date;
}

export function useAssignabilityVerification() {
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
        availableLeads: result.availableLeads,
        lastVerified: new Date()
      });
      
      if (result.updated > 0) {
        toast.success(`Verifica completata: aggiornati ${result.updated} lead su ${result.totalChecked} controllati`);
      } else {
        toast.success(`Verifica completata: tutti i ${result.totalChecked} lead erano già aggiornati`);
      }
      
      return result;
      
    } catch (error) {
      console.error("Errore durante la verifica:", error);
      setVerification(prev => ({ ...prev, status: 'error' }));
      toast.error("Errore durante la verifica dell'assegnabilità");
      throw error;
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

  return {
    verification,
    performVerification,
    resetVerification,
    isVerifying: verification.status === 'verifying'
  };
}
