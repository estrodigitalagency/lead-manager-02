
import { useState } from "react";
import { checkLeadsAssignability } from "@/services/leadAssignabilityService";
import { toast } from "sonner";

interface VerificationResult {
  status: 'idle' | 'completed' | 'error';
  updated: number;
  totalChecked: number;
  availableLeads: number;
}

export function useAssignabilityVerification() {
  const [verification, setVerification] = useState<VerificationResult>({
    status: 'idle',
    updated: 0,
    totalChecked: 0,
    availableLeads: 0
  });
  const [isVerifying, setIsVerifying] = useState(false);

  const performVerification = async () => {
    if (isVerifying) {
      console.log('🔒 Verification already in progress, skipping...');
      return verification;
    }

    setIsVerifying(true);
    console.log('🔍 Starting assignability verification...');
    
    try {
      const result = await checkLeadsAssignability();
      
      const newVerification = {
        status: 'completed' as const,
        updated: result.updated,
        totalChecked: result.totalChecked,
        availableLeads: result.availableLeads
      };
      
      setVerification(newVerification);
      
      // Solo un toast di successo qui
      if (result.updated > 0) {
        toast.success(`Verifica completata: ${result.updated} lead aggiornati`);
      } else {
        toast.success('Verifica completata: tutti i lead erano già aggiornati');
      }
      
      console.log('✅ Verification completed successfully:', newVerification);
      return newVerification;
    } catch (error) {
      console.error('❌ Error in verification:', error);
      
      const errorVerification = {
        status: 'error' as const,
        updated: 0,
        totalChecked: 0,
        availableLeads: 0
      };
      
      setVerification(errorVerification);
      toast.error('Errore durante la verifica dell\'assegnabilità');
      return errorVerification;
    } finally {
      setIsVerifying(false);
    }
  };

  const resetVerification = () => {
    setVerification({
      status: 'idle',
      updated: 0,
      totalChecked: 0,
      availableLeads: 0
    });
  };

  return {
    verification,
    isVerifying,
    performVerification,
    resetVerification
  };
}
