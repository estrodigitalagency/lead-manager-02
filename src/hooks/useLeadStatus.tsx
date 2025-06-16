
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lead } from "@/types/lead";
import { getLeadStatus } from "@/utils/leadStatus";

export function useLeadStatus() {
  const [daysBeforeAssignable, setDaysBeforeAssignable] = useState(7);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'days_before_assignable')
          .single();

        if (!error && data?.value) {
          setDaysBeforeAssignable(parseInt(data.value));
        }
      } catch (error) {
        console.error("Error fetching days_before_assignable setting:", error);
      }
    };

    fetchSettings();
  }, []);

  const getStatus = (lead: Lead) => {
    // PRIORITÀ: Usa sempre il calcolo dinamico per determinare lo stato corretto
    const dynamicStatus = getLeadStatus(lead, daysBeforeAssignable);
    
    // Log discrepanze per debug ma non bloccare l'UI
    const now = new Date();
    const leadCreatedAt = new Date(lead.created_at);
    const daysSinceCreation = (now.getTime() - leadCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    const shouldBeAssignable = lead.booked_call === 'NO' && 
                              daysSinceCreation >= daysBeforeAssignable && 
                              !lead.venditore;
    
    // OTTIMIZZAZIONE: Non fare console.log per ogni lead per migliorare performance
    if (shouldBeAssignable && !lead.assignable) {
      // Solo log una volta ogni 10 secondi per evitare spam
      const lastLogKey = `lead-discrepancy-${lead.id}`;
      const lastLog = sessionStorage.getItem(lastLogKey);
      const now = Date.now();
      
      if (!lastLog || (now - parseInt(lastLog)) > 10000) {
        console.log(`Lead ${lead.id} discrepancy: should be assignable but DB says no`);
        sessionStorage.setItem(lastLogKey, now.toString());
      }
    }
    
    // SEMPRE ritorna il calcolo dinamico per UI reattiva
    return dynamicStatus;
  };

  return { getStatus, daysBeforeAssignable };
}
