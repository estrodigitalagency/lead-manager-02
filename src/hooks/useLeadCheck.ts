
import { useState, useEffect } from "react";
import { triggerLeadCheck } from "@/services/databaseService";
import { toast } from "sonner";

export const useLeadCheck = () => {
  const [isCheckingLeads, setIsCheckingLeads] = useState(false);

  useEffect(() => {
    // Esegui automaticamente il controllo dei lead all'apertura dell'app
    const performLeadCheck = async () => {
      console.log("🔍 Starting automatic lead check...");
      setIsCheckingLeads(true);
      
      // Safety timeout - force stop loading after 30 seconds
      const timeoutId = setTimeout(() => {
        console.warn("⚠️ Lead check timeout reached, stopping loading indicator");
        setIsCheckingLeads(false);
        toast.error("Il controllo dei lead ha impiegato troppo tempo");
      }, 30000);

      try {
        console.log("📞 Calling triggerLeadCheck...");
        const result = await triggerLeadCheck();
        console.log("✅ Lead check completed:", result);
        clearTimeout(timeoutId);
      } catch (error) {
        console.error("❌ Errore nel controllo automatico dei lead:", error);
        clearTimeout(timeoutId);
        // Don't show error toast for automatic check to avoid annoying users
      } finally {
        console.log("🏁 Lead check finished, setting loading to false");
        setIsCheckingLeads(false);
      }
    };

    performLeadCheck();
  }, []);

  const handleManualLeadCheck = async () => {
    console.log("🔍 Starting manual lead check...");
    setIsCheckingLeads(true);
    
    // Safety timeout for manual check too
    const timeoutId = setTimeout(() => {
      console.warn("⚠️ Manual lead check timeout reached");
      setIsCheckingLeads(false);
      toast.error("Il controllo dei lead ha impiegato troppo tempo");
    }, 30000);

    try {
      console.log("📞 Calling manual triggerLeadCheck...");
      const success = await triggerLeadCheck();
      console.log("✅ Manual lead check result:", success);
      clearTimeout(timeoutId);
      
      if (success) {
        toast.success("Controllo dei lead completato con successo");
      } else {
        toast.warning("Il controllo dei lead è stato completato ma potrebbero esserci problemi");
      }
    } catch (error) {
      console.error("❌ Errore nel controllo manuale dei lead:", error);
      clearTimeout(timeoutId);
      toast.error("Errore nel controllo dei lead");
    } finally {
      console.log("🏁 Manual lead check finished");
      setIsCheckingLeads(false);
    }
  };

  return { isCheckingLeads, handleManualLeadCheck };
};
