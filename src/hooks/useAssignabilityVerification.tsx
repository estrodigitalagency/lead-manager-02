
import { useState } from "react";
import { toast } from "sonner";
import { checkLeadsAssignability } from "@/services/leadAssignabilityService";
import { useLeadSync } from "@/contexts/LeadSyncContext";

interface VerificationState {
  status: 'initial' | 'verifying' | 'completed' | 'error';
  totalChecked: number;
  updated: number;
  availableLeads: number;
  lastVerified?: Date;
}

export function useAssignabilityVerification() {
  const { setIsVerifying, refreshAllData } = useLeadSync();
  const [verification, setVerification] = useState<VerificationState>({
    status: 'initial',
    totalChecked: 0,
    updated: 0,
    availableLeads: 0
  });

  const performVerification = async () => {
    console.log("🔍 Starting assignability verification...");
    setVerification(prev => ({ ...prev, status: 'verifying' }));
    setIsVerifying(true);
    
    try {
      const result = await checkLeadsAssignability();
      
      console.log("✅ Verification completed:", result);
      
      setVerification({
        status: 'completed',
        totalChecked: result.totalChecked,
        updated: result.updated,
        availableLeads: result.availableLeads,
        lastVerified: new Date()
      });
      
      // Trigger aggiornamento globale aggiuntivo per sicurezza
      console.log("🔄 Additional global refresh after verification...");
      await refreshAllData();
      
      if (result.updated > 0) {
        toast.success(`Verifica completata: aggiornati ${result.updated} lead su ${result.totalChecked} controllati`);
      } else {
        toast.success(`Verifica completata: tutti i ${result.totalChecked} lead erano già aggiornati`);
      }
      
      return result;
      
    } catch (error) {
      console.error("❌ Errore durante la verifica:", error);
      setVerification(prev => ({ ...prev, status: 'error' }));
      toast.error("Errore durante la verifica dell'assegnabilità");
      throw error;
    } finally {
      setIsVerifying(false);
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
