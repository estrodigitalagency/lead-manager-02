
import { useState, useEffect, useRef } from "react";
import { triggerLeadCheck } from "@/services/databaseService";
import { toast } from "sonner";

export const useLeadCheck = () => {
  const [isCheckingLeads, setIsCheckingLeads] = useState(false);
  const hasTriggeredAutoCheck = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Evita di eseguire il controllo automatico più di una volta
    if (hasTriggeredAutoCheck.current) return;
    
    const performLeadCheck = async () => {
      console.log("🔍 Starting automatic lead check...");
      setIsCheckingLeads(true);
      hasTriggeredAutoCheck.current = true;
      
      // Safety timeout - force stop loading after 15 seconds (ridotto da 30)
      timeoutRef.current = setTimeout(() => {
        console.warn("⚠️ Lead check timeout reached, stopping loading indicator");
        setIsCheckingLeads(false);
        toast.error("Il controllo dei lead ha impiegato troppo tempo");
      }, 15000);

      try {
        console.log("📞 Calling triggerLeadCheck...");
        const result = await triggerLeadCheck();
        console.log("✅ Lead check completed:", result);
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      } catch (error) {
        console.error("❌ Errore nel controllo automatico dei lead:", error);
        
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        
        // Non mostrare errore per il controllo automatico per evitare di infastidire l'utente
      } finally {
        console.log("🏁 Lead check finished, setting loading to false");
        setIsCheckingLeads(false);
      }
    };

    // Aggiungi un piccolo delay prima di iniziare il controllo automatico
    const delayedCheck = setTimeout(() => {
      performLeadCheck();
    }, 1000);

    return () => {
      clearTimeout(delayedCheck);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleManualLeadCheck = async () => {
    console.log("🔍 Starting manual lead check...");
    setIsCheckingLeads(true);
    
    // Safety timeout per il controllo manuale
    const manualTimeoutId = setTimeout(() => {
      console.warn("⚠️ Manual lead check timeout reached");
      setIsCheckingLeads(false);
      toast.error("Il controllo dei lead ha impiegato troppo tempo");
    }, 15000);

    try {
      console.log("📞 Calling manual triggerLeadCheck...");
      const success = await triggerLeadCheck();
      console.log("✅ Manual lead check result:", success);
      clearTimeout(manualTimeoutId);
      
      if (success) {
        toast.success("Controllo dei lead completato con successo");
      } else {
        toast.warning("Il controllo dei lead è stato completato ma potrebbero esserci problemi");
      }
    } catch (error) {
      console.error("❌ Errore nel controllo manuale dei lead:", error);
      clearTimeout(manualTimeoutId);
      toast.error("Errore nel controllo dei lead");
    } finally {
      console.log("🏁 Manual lead check finished");
      setIsCheckingLeads(false);
    }
  };

  return { isCheckingLeads, handleManualLeadCheck };
};
