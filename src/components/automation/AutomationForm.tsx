import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { useSalespeopleData } from "@/hooks/useSalespeopleData";
import { NewAutomationForm, LeadAssignmentAutomation } from "@/types/automation";

const automationSchema = z.object({
  nome: z.string().min(1, "Il nome è obbligatorio"),
  trigger_when: z.enum(['new_lead', 'duplicate_different_source']),
  trigger_field: z.enum(['ultima_fonte', 'fonte', 'nome', 'email', 'telefono', 'campagna', 'lead_score', 'created_at']),
  condition_type: z.enum(['contains', 'equals', 'starts_with', 'ends_with', 'not_contains']),
  condition_value: z.string().min(1, "Il valore della condizione è obbligatorio"),
  action_type: z.enum(['assign_to_seller', 'assign_to_previous_seller']),
  target_seller_id: z.string().optional(),
  sheets_tab_name: z.string().optional(),
  campagna: z.string().optional(),
  webhook_enabled: z.boolean().optional(),
});

interface AutomationFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: NewAutomationForm) => Promise<void>;
  automation?: LeadAssignmentAutomation;
  isLoading?: boolean;
}

const triggerFieldLabels = {
  ultima_fonte: "Ultima Fonte",
  fonte: "Fonte",
  nome: "Nome",
  email: "Email", 
  telefono: "Telefono",
  campagna: "Campagna",
  lead_score: "Lead Score",
  created_at: "Data Creazione"
};

const conditionTypeLabels = {
  contains: "Contiene",
  equals: "È uguale a",
  starts_with: "Inizia con",
  ends_with: "Finisce con",
  not_contains: "Non contiene"
};

const actionTypeLabels = {
  assign_to_seller: "Assegna a venditore specifico",
  assign_to_previous_seller: "Assegna al venditore precedente"
};

export function AutomationForm({ open, onOpenChange, onSubmit, automation, isLoading }: AutomationFormProps) {
  const { venditori } = useSalespeopleData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<NewAutomationForm>({
    resolver: zodResolver(automationSchema),
    defaultValues: {
      nome: automation?.nome || "",
      trigger_when: automation?.trigger_when || "new_lead",
      trigger_field: automation?.trigger_field || "ultima_fonte",
      condition_type: automation?.condition_type || "contains",
      condition_value: automation?.condition_value || "",
      action_type: automation?.action_type || "assign_to_seller",
      target_seller_id: automation?.target_seller_id || undefined,
      sheets_tab_name: automation?.sheets_tab_name || "",
      campagna: automation?.campagna || "",
      webhook_enabled: automation?.webhook_enabled ?? true,
    },
  });

  const actionType = form.watch("action_type");

  // Reset form when automation prop changes
  useEffect(() => {
    if (automation) {
      form.reset({
        nome: automation.nome || "",
        trigger_when: automation.trigger_when || "new_lead",
        trigger_field: automation.trigger_field || "ultima_fonte",
        condition_type: automation.condition_type || "contains",
        condition_value: automation.condition_value || "",
        action_type: automation.action_type || "assign_to_seller",
        target_seller_id: automation.target_seller_id || undefined,
        sheets_tab_name: automation.sheets_tab_name || "",
        campagna: automation.campagna || "",
        webhook_enabled: automation.webhook_enabled ?? true,
      });
    } else {
      form.reset({
        nome: "",
        trigger_when: "new_lead",
        trigger_field: "ultima_fonte",
        condition_type: "contains",
        condition_value: "",
        action_type: "assign_to_seller",
        target_seller_id: undefined,
        sheets_tab_name: "",
        campagna: "",
        webhook_enabled: true,
      });
    }
  }, [automation, form]);

  const handleSubmit = async (data: NewAutomationForm) => {
    try {
      setIsSubmitting(true);
      await onSubmit(data);
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting automation:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {automation ? "Modifica Automazione" : "Nuova Automazione"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Automazione</FormLabel>
                  <FormControl>
                    <Input placeholder="es. Facebook Ads al venditore Mario" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trigger_when"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Quando Attivare</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona quando attivare" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="new_lead">Nuovo Lead</SelectItem>
                      <SelectItem value="duplicate_different_source">Lead Duplicato (Fonte Diversa)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="trigger_field"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campo Trigger</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona campo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(triggerFieldLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="condition_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo Condizione</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona condizione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(conditionTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="condition_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valore</FormLabel>
                    <FormControl>
                      <Input placeholder="es. facebook" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="action_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Azione</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleziona azione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(actionTypeLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {actionType === "assign_to_seller" && (
              <FormField
                control={form.control}
                name="target_seller_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Venditore</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleziona venditore" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {venditori.filter(v => v.stato === 'attivo').map((venditore) => (
                          <SelectItem key={venditore.id} value={venditore.id}>
                            {venditore.nome} {venditore.cognome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="sheets_tab_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Tab Google Sheets (opzionale)</FormLabel>
                  <FormControl>
                    <Input placeholder="es. Facebook, Ads, Eventi" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="campagna"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campagna (opzionale)</FormLabel>
                  <FormControl>
                    <Input placeholder="es. Workshop Settembre25" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(actionType === "assign_to_seller" || actionType === "assign_to_previous_seller") && (
              <FormField
                control={form.control}
                name="webhook_enabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox 
                        checked={field.value} 
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Invia dati via webhook
                      </FormLabel>
                      <p className="text-sm text-muted-foreground">
                        Se abilitato, i dati dell'assegnazione verranno inviati al webhook configurato
                      </p>
                    </div>
                  </FormItem>
                )}
              />
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoading}>
                {isSubmitting ? "Salvando..." : automation ? "Aggiorna" : "Crea"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}