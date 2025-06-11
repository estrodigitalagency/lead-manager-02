
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
    return getLeadStatus(lead, daysBeforeAssignable);
  };

  return { getStatus, daysBeforeAssignable };
}
