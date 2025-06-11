
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { supabase } from "@/integrations/supabase/client";
import WebhookTestSection from "./WebhookTestSection";

interface WebhookFormValues {
  leadAssignWebhook: string;
}

export default function WebhookSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [webhooks, setWebhooks] = useState<{ leadAssign: string }>({
    leadAssign: '',
  });

  const form = useForm<WebhookFormValues>({
    defaultValues: {
      leadAssignWebhook: '',
    },
  });

  // Load saved webhook settings
  useEffect(() => {
    async function loadWebhookSettings() {
      try {
        const { data: leadAssignData } = await supabase
          .from('system_settings')
          .select('value')
          .eq('key', 'lead_assign_webhook_url')
          .single();
        
        if (leadAssignData) {
          setWebhooks(prev => ({ ...prev, leadAssign: leadAssignData.value }));
          form.setValue('leadAssignWebhook', leadAssignData.value);
        }
      } catch (error) {
        console.error("Error loading webhook settings:", error);
      }
    }
    
    loadWebhookSettings();
  }, [form]);

  async function onSubmit(values: WebhookFormValues) {
    setIsLoading(true);
    
    try {
      // Try to validate the webhook URL
      if (values.leadAssignWebhook && !values.leadAssignWebhook.startsWith('http')) {
        toast.error("L'URL del webhook deve iniziare con http:// o https://");
        setIsLoading(false);
        return;
      }
      
      // Update or insert lead assign webhook URL
      const { error: leadAssignError } = await supabase
        .from('system_settings')
        .upsert({
          key: 'lead_assign_webhook_url',
          value: values.leadAssignWebhook,
          descrizione: 'URL webhook per assegnazione lead'
        }, {
          onConflict: 'key'
        });

      if (leadAssignError) throw leadAssignError;
      
      toast.success("Impostazioni webhook salvate con successo");
    } catch (error) {
      console.error("Error saving webhook settings:", error);
      toast.error("Errore nel salvare le impostazioni webhook");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurazione Webhook</CardTitle>
          <CardDescription>
            Configura gli URL dei webhook per inviare automaticamente i dati a sistemi esterni
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="leadAssignWebhook"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>URL Webhook Assegnazione Lead</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="https://example.com/webhook" 
                        {...field} 
                        className="font-mono"
                      />
                    </FormControl>
                    <FormDescription>
                      Questo URL riceverà i dati dei lead quando vengono assegnati a un venditore
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Salvataggio..." : "Salva impostazioni"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <WebhookTestSection />
    </div>
  );
}
