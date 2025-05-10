
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { fetchSalespeople } from "@/services/sheetsService";
import { assignLeads } from "@/services/assignmentService";
import { getUnassignedLeads } from "@/services/leadService";
import { Lead } from "@/types/lead";

// Define form schema with validation
const formSchema = z.object({
  numLead: z.coerce
    .number()
    .int("Inserisci un numero intero")
    .positive("Il numero deve essere positivo")
    .min(1, "Inserisci almeno 1 lead"),
  venditore: z.string().min(1, "Seleziona un venditore"),
  campagna: z.string().optional(),
});

export type FormValues = z.infer<typeof formSchema>;

export const useAssignmentForm = (onAssignmentSuccess: () => void) => {
  const [salespeople, setSalespeople] = useState<string[]>([]);
  const [availableLeads, setAvailableLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);

  // Initialize form
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      numLead: undefined,
      venditore: "",
      campagna: "",
    },
  });

  // Fetch salespeople from Google Sheets and available leads from database
  useEffect(() => {
    const loadData = async () => {
      try {
        const [salesPeopleData, leadsData] = await Promise.all([
          fetchSalespeople(),
          getUnassignedLeads()
        ]);
        
        setSalespeople(salesPeopleData);
        setAvailableLeads(leadsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
        toast.error("Impossibile caricare i dati necessari");
      } finally {
        setIsFetchingData(false);
      }
    };

    loadData();
  }, []);

  // Handle form submission
  const onSubmit = async (values: FormValues) => {
    if (values.numLead > availableLeads.length) {
      toast.error(`Solo ${availableLeads.length} lead disponibili per l'assegnazione`);
      return;
    }

    setIsLoading(true);
    try {
      await assignLeads({
        numLead: values.numLead,
        venditore: values.venditore,
        campagna: values.campagna || undefined,
      });
      
      toast.success("Lead assegnati con successo!");
      form.reset();
      
      // Refresh available leads after assignment
      const newAvailableLeads = await getUnassignedLeads();
      setAvailableLeads(newAvailableLeads);
      
      onAssignmentSuccess();
    } catch (error) {
      toast.error("Errore nell'assegnazione dei lead. Riprova.");
      console.error("Assignment error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    form,
    salespeople,
    availableLeads,
    isLoading,
    isFetchingData,
    onSubmit
  };
};
