
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
    // Usa sempre il calcolo dinamico per determinare lo stato reale
    const dynamicStatus = getLeadStatus(lead, daysBeforeAssignable);
    
    // Se il campo assignable del database non è sincronizzato con il calcolo dinamico,
    // dai priorità al calcolo dinamico
    const now = new Date();
    const leadCreatedAt = new Date(lead.created_at);
    const daysSinceCreation = (now.getTime() - leadCreatedAt.getTime()) / (1000 * 60 * 60 * 24);
    
    // Verifica se il lead dovrebbe essere assegnabile secondo la logica di business
    const shouldBeAssignable = lead.booked_call === 'NO' && 
                              daysSinceCreation >= daysBeforeAssignable && 
                              !lead.venditore;
    
    // Se c'è una discrepanza tra database e calcolo dinamico, mostra il calcolo dinamico
    if (shouldBeAssignable && !lead.assignable) {
      console.log(`Lead ${lead.id} dovrebbe essere assegnabile ma il database dice di no - usando calcolo dinamico`);
    }
    
    return dynamicStatus;
  };

  return { getStatus, daysBeforeAssignable };
}
