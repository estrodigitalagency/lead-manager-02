
import { useState, useRef } from "react";
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
  
  // Sistema più robusto per prevenire duplicati
  const isVerifyingRef = useRef<boolean>(false);
  const lastToastTime = useRef<number>(0);
  const TOAST_COOLDOWN = 10000; // 10 secondi di cooldown per essere sicuri

  const performVerification = async () => {
    // Controlla se è già in corso una verifica
    if (isVerifyingRef.current) {
      console.log("🚫 Verification already in progress, skipping...");
      return;
    }

    console.log("🔍 Starting assignability verification...");
    isVerifyingRef.current = true;
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
      
      // Trigger aggiornamento globale
      console.log("🔄 Additional global refresh after verification...");
      await refreshAllData();
      
      // Show toast SOLO UNA VOLTA con controllo più stringente
      const now = Date.now();
      if (now - lastToastTime.current > TOAST_COOLDOWN) {
        lastToastTime.current = now;
        
        if (result.updated > 0) {
          toast.success(`Verifica completata: aggiornati ${result.updated} lead su ${result.totalChecked} controllati`);
        } else {
          toast.success(`Verifica completata: tutti i ${result.totalChecked} lead erano già aggiornati`);
        }
      }
      
      return result;
      
    } catch (error) {
      console.error("❌ Errore durante la verifica:", error);
      setVerification(prev => ({ ...prev, status: 'error' }));
      
      // Show error toast solo se non ne abbiamo mostrato uno di recente
      const now = Date.now();
      if (now - lastToastTime.current > TOAST_COOLDOWN) {
        lastToastTime.current = now;
        toast.error("Errore durante la verifica dell'assegnabilità");
      }
      
      throw error;
    } finally {
      isVerifyingRef.current = false;
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
    // Reset anche i flag
    isVerifyingRef.current = false;
  };

  return {
    verification,
    performVerification,
    resetVerification,
    isVerifying: verification.status === 'verifying' || isVerifyingRef.current
  };
}
