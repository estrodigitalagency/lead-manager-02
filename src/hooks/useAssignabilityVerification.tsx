
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
  
  // Prevent multiple toast notifications with ref - più restrittivo
  const lastToastTime = useRef<number>(0);
  const isShowingToast = useRef<boolean>(false);
  const TOAST_COOLDOWN = 5000; // 5 secondi di cooldown tra toast

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
      
      // Show toast SOLO UNA VOLTA per verifica con controllo più stringente
      const now = Date.now();
      if (!isShowingToast.current && now - lastToastTime.current > TOAST_COOLDOWN) {
        isShowingToast.current = true;
        lastToastTime.current = now;
        
        if (result.updated > 0) {
          toast.success(`Verifica completata: aggiornati ${result.updated} lead su ${result.totalChecked} controllati`);
        } else {
          toast.success(`Verifica completata: tutti i ${result.totalChecked} lead erano già aggiornati`);
        }
        
        // Reset flag dopo un breve delay
        setTimeout(() => {
          isShowingToast.current = false;
        }, 1000);
      }
      
      return result;
      
    } catch (error) {
      console.error("❌ Errore durante la verifica:", error);
      setVerification(prev => ({ ...prev, status: 'error' }));
      
      // Show error toast solo se non stiamo già mostrando un toast
      const now = Date.now();
      if (!isShowingToast.current && now - lastToastTime.current > TOAST_COOLDOWN) {
        isShowingToast.current = true;
        lastToastTime.current = now;
        toast.error("Errore durante la verifica dell'assegnabilità");
        
        setTimeout(() => {
          isShowingToast.current = false;
        }, 1000);
      }
      
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
    // Reset anche i flag di toast
    isShowingToast.current = false;
  };

  return {
    verification,
    performVerification,
    resetVerification,
    isVerifying: verification.status === 'verifying'
  };
}
