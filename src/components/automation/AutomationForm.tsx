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
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useSalespeopleData } from "@/hooks/useSalespeopleData";
import { NewAutomationForm, LeadAssignmentAutomation } from "@/types/automation";
import { supabase } from "@/integrations/supabase/client";

const automationSchema = z.object({
  nome: z.string().min(1, "Il nome è obbligatorio"),
  trigger_when: z.enum(['new_lead', 'duplicate_different_source']),
  trigger_field: z.enum(['ultima_fonte', 'fonte', 'nome', 'email', 'telefono', 'campagna', 'lead_score', 'created_at']),
  condition_type: z.enum(['contains', 'equals', 'starts_with', 'ends_with', 'not_contains']),
  condition_value: z.array(z.string()).min(1, "Seleziona almeno una fonte"),
  action_type: z.enum(['assign_to_seller', 'assign_to_previous_seller']),
  target_seller_id: z.string().optional(),
  sheets_tab_name: z.string().optional(),
  campagna: z.string().optional(),
  webhook_enabled: z.boolean().optional(),
  excluded_sellers: z.array(z.string()).optional(),
  lock_period_enabled: z.boolean().optional(),
  lock_period_days: z.number().optional(),
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
  const [conditionInput, setConditionInput] = useState("");

  const form = useForm<NewAutomationForm>({
    resolver: zodResolver(automationSchema),
    defaultValues: {
      nome: automation?.nome || "",
      trigger_when: automation?.trigger_when || "new_lead",
      trigger_field: automation?.trigger_field || "ultima_fonte",
      condition_type: automation?.condition_type || "contains",
      condition_value: automation?.condition_value || [],
      action_type: automation?.action_type || "assign_to_seller",
      target_seller_id: automation?.target_seller_id || undefined,
      sheets_tab_name: automation?.sheets_tab_name || "",
      campagna: automation?.campagna || "",
      webhook_enabled: automation?.webhook_enabled ?? true,
      excluded_sellers: automation?.excluded_sellers || [],
      lock_period_enabled: automation?.lock_period_days !== undefined && automation?.lock_period_days !== null,
      lock_period_days: automation?.lock_period_days || 30,
    },
  });

  const actionType = form.watch("action_type");
  const triggerField = form.watch("trigger_field");
  const lockPeriodEnabled = form.watch("lock_period_enabled");

  // Reset form when automation prop changes
  useEffect(() => {
    if (automation) {
      form.reset({
        nome: automation.nome || "",
        trigger_when: automation.trigger_when || "new_lead",
        trigger_field: automation.trigger_field || "ultima_fonte",
        condition_type: automation.condition_type || "contains",
        condition_value: automation.condition_value || [],
        action_type: automation.action_type || "assign_to_seller",
        target_seller_id: automation.target_seller_id || undefined,
        sheets_tab_name: automation.sheets_tab_name || "",
        campagna: automation.campagna || "",
        webhook_enabled: automation.webhook_enabled ?? true,
        excluded_sellers: automation.excluded_sellers || [],
        lock_period_enabled: automation.lock_period_days !== undefined && automation.lock_period_days !== null,
        lock_period_days: automation.lock_period_days || 30,
      });
    } else {
      form.reset({
        nome: "",
        trigger_when: "new_lead",
        trigger_field: "ultima_fonte",
        condition_type: "contains",
        condition_value: [],
        action_type: "assign_to_seller",
        target_seller_id: undefined,
        sheets_tab_name: "",
        campagna: "",
        webhook_enabled: true,
        excluded_sellers: [],
        lock_period_enabled: false,
        lock_period_days: 30,
      });
    }
  }, [automation, form]);

  const handleSubmit = async (data: NewAutomationForm) => {
    try {
      setIsSubmitting(true);
      
      // Remove lock_period_enabled from the data and set lock_period_days to undefined if not enabled
      const { lock_period_enabled, ...submissionData } = data;
      if (!lock_period_enabled) {
        submissionData.lock_period_days = undefined;
      }
      
      await onSubmit(submissionData);
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base sm:text-lg">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <FormLabel>Valore Condizione</FormLabel>
                    <FormControl>
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input 
                            placeholder="es. workshop"
                            value={conditionInput}
                            onChange={(e) => setConditionInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const value = conditionInput.trim();
                                if (value && !field.value?.includes(value)) {
                                  const currentValues = field.value || [];
                                  field.onChange([...currentValues, value]);
                                  setConditionInput('');
                                }
                              }
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              const value = conditionInput.trim();
                              if (value && !field.value?.includes(value)) {
                                const currentValues = field.value || [];
                                field.onChange([...currentValues, value]);
                                setConditionInput('');
                              }
                            }}
                          >
                            Aggiungi
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Inserisci un valore e premi Invio o clicca Aggiungi
                        </p>
                        
                        {field.value && field.value.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {field.value.map((value, index) => (
                              <Badge 
                                key={index} 
                                variant="secondary" 
                                className="flex items-center gap-1"
                              >
                                {value}
                                <X 
                                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                  onClick={() => {
                                    const newValues = field.value?.filter((_, i) => i !== index);
                                    field.onChange(newValues);
                                  }}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
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

            {actionType === "assign_to_previous_seller" && (
              <>
                <FormField
                  control={form.control}
                  name="lock_period_enabled"
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
                          Abilita Giorni di Blocco
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Se abilitato, il lead sarà riassegnato solo entro il periodo specificato
                        </p>
                      </div>
                    </FormItem>
                  )}
                />

                {lockPeriodEnabled && (
                  <FormField
                    control={form.control}
                    name="lock_period_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Numero Giorni</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="es. 30" 
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <p className="text-sm text-muted-foreground">
                          Il lead sarà riassegnato solo entro {field.value || 0} giorni dall'ultima assegnazione
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="excluded_sellers"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Venditori Esclusi (opzionale)</FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <Select
                            onValueChange={(value) => {
                              if (value && !field.value?.includes(value)) {
                                const currentValues = field.value || [];
                                field.onChange([...currentValues, value]);
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Seleziona venditore da escludere" />
                            </SelectTrigger>
                            <SelectContent>
                              {venditori.map((venditore) => (
                                <SelectItem 
                                  key={venditore.id} 
                                  value={`${venditore.nome} ${venditore.cognome}`.trim()}
                                  disabled={field.value?.includes(`${venditore.nome} ${venditore.cognome}`.trim())}
                                >
                                  {venditore.nome} {venditore.cognome}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {field.value && field.value.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {field.value.map((seller, index) => (
                                <Badge 
                                  key={index} 
                                  variant="secondary" 
                                  className="flex items-center gap-1"
                                >
                                  {seller}
                                  <X 
                                    className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                    onClick={() => {
                                      const newValues = field.value?.filter((_, i) => i !== index);
                                      field.onChange(newValues);
                                    }}
                                  />
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Se il venditore precedente è uno di questi, l'automazione non si attiva
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
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
                      Abilita Invio Webhook
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Se abilitato, i dati dell'assegnazione verranno inviati al webhook configurato
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Annulla
              </Button>
              <Button type="submit" disabled={isSubmitting || isLoading} className="w-full sm:w-auto">
                {isSubmitting ? "Salvando..." : automation ? "Aggiorna" : "Crea"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}