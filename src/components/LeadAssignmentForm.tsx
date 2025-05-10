
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { fetchSalespeople } from "@/services/sheetsService";
import { assignLeads } from "@/services/leadService";
import { Loader2 } from "lucide-react";
import { getUnassignedLeads } from "@/services/databaseService";
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

type FormValues = z.infer<typeof formSchema>;

interface LeadAssignmentFormProps {
  onAssignmentSuccess: () => void;
}

const LeadAssignmentForm = ({ onAssignmentSuccess }: LeadAssignmentFormProps) => {
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
      await assignLeads(values);
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

  if (isFetchingData) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Caricamento dati...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 p-4 rounded-md mb-4">
        <h3 className="text-sm font-medium mb-2">Lead disponibili: {availableLeads.length}</h3>
        <p className="text-xs text-muted-foreground">
          {availableLeads.length === 0 
            ? "Non ci sono lead disponibili da assegnare." 
            : "Questi lead non sono ancora stati assegnati a nessun venditore."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Number of Leads Field */}
          <FormField
            control={form.control}
            name="numLead"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Numero di lead *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Inserisci il numero di lead"
                    {...field}
                    max={availableLeads.length}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Salesperson Field */}
          <FormField
            control={form.control}
            name="venditore"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Venditore *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleziona un venditore" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {salespeople.length > 0 ? (
                      salespeople.map((person) => (
                        <SelectItem key={person} value={person}>
                          {person}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>
                        Nessun venditore disponibile
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campaign Field (Optional) */}
          <FormField
            control={form.control}
            name="campagna"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Campagna</FormLabel>
                <FormControl>
                  <Input placeholder="Inserisci la campagna (opzionale)" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Submit Button */}
          <Button type="submit" className="w-full" disabled={isLoading || availableLeads.length === 0}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assegnazione in corso...
              </>
            ) : (
              "Assegna"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default LeadAssignmentForm;
