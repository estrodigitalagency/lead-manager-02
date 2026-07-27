import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import {
  Webhook, ArrowRightLeft, Users, Database, Tag, Zap, RefreshCw, MessageCircle,
  Clock, Send, Trophy,
} from "lucide-react";
import SalespeopleSettings from "@/components/SalespeopleSettings";
import CampaignsSettings from "@/components/CampaignsSettings";
import DatabaseSection from "@/components/settings/DatabaseSection";
import WhatsAppTemplatesSection from "@/components/settings/WhatsAppTemplatesSection";
import AttributionWindowSettings from "@/components/settings/AttributionWindowSettings";
import WebhookSettings from "@/components/settings/WebhookSettings";
import { AutomationSettings } from "@/components/automation/AutomationSettings";
import { RoundRobinFixSection } from "@/components/settings/RoundRobinFixSection";
import FonteMappingSettings from "@/components/settings/FonteMappingSettings";
import CallFonteGroupSettings from "@/components/settings/CallFonteGroupSettings";
import RankingSettingsSection from "@/components/settings/RankingSettingsSection";
import ValoreCallView from "@/components/settings/ValoreCallView";
import { useIsMobile } from "@/hooks/use-mobile";

interface SettingItem {
  value: string;
  icon: typeof Users;
  label: string;
  desc: string;
}
interface SettingGroup {
  group: string;
  items: SettingItem[];
}

const sections: SettingGroup[] = [
  {
    group: "Team & Campagne",
    items: [
      { value: "salespeople", icon: Users, label: "Venditori", desc: "Anagrafica venditori, fogli Google, capacità e stato." },
      { value: "campaigns", icon: Tag, label: "Campagne", desc: "Preset di filtri fonte, lock period e distribuzione riutilizzabili." },
      { value: "ranking", icon: Trophy, label: "Ranking & Valore call", desc: "Valore call/lead per fonte (live dai fogli venditore) e configurazione della classifica commerciale pubblica." },
    ],
  },
  {
    group: "Regole di assegnazione",
    items: [
      { value: "automations", icon: Zap, label: "Automazioni", desc: "Assegnazione automatica al venditore precedente o distribuzione tra più venditori." },
      { value: "roundrobin", icon: RefreshCw, label: "Round Robin", desc: "Correzione e ribilanciamento delle assegnazioni round-robin." },
      { value: "attribution", icon: Clock, label: "Finestra attribuzione", desc: "Giorni entro cui una call viene attribuita alla fonte del lead." },
    ],
  },
  {
    group: "Integrazioni",
    items: [
      { value: "webhooks", icon: Webhook, label: "Webhook", desc: "URL Make.com per l'invio dei dati di assegnazione ai fogli." },
      { value: "whatsapp", icon: MessageCircle, label: "Link WhatsApp", desc: "Link personalizzati che portano i lead sul WhatsApp del venditore assegnato." },
      { value: "fontemapping", icon: ArrowRightLeft, label: "Mapping fonte", desc: "Corrispondenze tra le fonti del lead e quelle del calendario." },
    ],
  },
  {
    group: "Sistema",
    items: [
      { value: "database", icon: Database, label: "Database", desc: "Manutenzione, pulizia e diagnostica dei dati." },
    ],
  },
];

const allItems = sections.flatMap((s) => s.items);

const Settings = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("automations");

  const activeItem = allItems.find((item) => item.value === activeTab);
  const ActiveIcon = activeItem?.icon;

  return (
    <div className={`w-full min-h-screen max-w-7xl mx-auto ${isMobile ? "pt-16 pb-24 px-4" : "pt-16 px-6 py-8"}`}>
      <div className="flex items-center gap-2.5 mb-1">
        <Send className="h-4 w-4 text-primary" />
        <h1 className="text-[18px] font-semibold text-foreground tracking-tight">Impostazioni</h1>
      </div>
      <p className="text-[12.5px] text-muted-foreground mb-6">
        Configura team, regole di assegnazione e integrazioni.
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" orientation={isMobile ? "horizontal" : "vertical"}>
        {isMobile ? (
          <div className="mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full h-10 rounded-md">
                <div className="flex items-center gap-2">
                  {ActiveIcon && <ActiveIcon className="h-4 w-4 text-primary" />}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectGroup key={section.group}>
                    <SelectLabel className="label-eyebrow px-2 py-1.5">{section.group}</SelectLabel>
                    {section.items.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <SelectItem key={tab.value} value={tab.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4" />
                            {tab.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="flex gap-6 min-h-[600px]">
            {/* Sidebar navigation */}
            <div className="w-60 flex-shrink-0 space-y-5">
              {sections.map((section) => (
                <div key={section.group}>
                  <p className="label-eyebrow mb-1.5 px-2">{section.group}</p>
                  <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 gap-0.5">
                    {section.items.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="w-full justify-start gap-2.5 px-2.5 py-1.5 h-8 text-[12.5px] font-medium text-muted-foreground data-[state=active]:bg-secondary data-[state=active]:text-foreground data-[state=active]:shadow-none hover:text-foreground hover:bg-secondary/60 rounded-md transition-colors"
                        >
                          <Icon className="h-3.5 w-3.5 flex-shrink-0 stroke-[1.75]" />
                          {tab.label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
              ))}
            </div>

            {/* Content — flex-1 + min-w-0 + overflow-hidden: larghezza stabile senza collassare */}
            <div className="flex-1 min-w-0 overflow-x-hidden">
              {/* Section header */}
              {activeItem && (
                <div className="mb-5 pb-4 border-b border-border">
                  <div className="flex items-center gap-2 mb-1">
                    {ActiveIcon && <ActiveIcon className="h-4 w-4 text-primary" />}
                    <h2 className="text-[15px] font-semibold text-foreground tracking-tight">{activeItem.label}</h2>
                  </div>
                  <p className="text-[12.5px] text-muted-foreground max-w-2xl">{activeItem.desc}</p>
                </div>
              )}
              <div className="w-full max-w-[880px]">
                <SettingsContent />
              </div>
            </div>
          </div>
        )}

        {isMobile && (
          <>
            {activeItem && (
              <div className="mb-4 pb-3 border-b border-border">
                <p className="text-[12.5px] text-muted-foreground">{activeItem.desc}</p>
              </div>
            )}
            <SettingsContent />
          </>
        )}
      </Tabs>
    </div>
  );
};

const SettingsContent = () => (
  <>
    <TabsContent value="database" className="mt-0">
      <DatabaseSection />
    </TabsContent>

    <TabsContent value="whatsapp" className="mt-0">
      <WhatsAppTemplatesSection />
    </TabsContent>

    <TabsContent value="attribution" className="mt-0">
      <AttributionWindowSettings />
    </TabsContent>

    <TabsContent value="webhooks" className="mt-0">
      <WebhookSettings />
    </TabsContent>

    <TabsContent value="salespeople" className="mt-0">
      <SalespeopleSettings />
    </TabsContent>

    <TabsContent value="campaigns" className="mt-0">
      <CampaignsSettings />
    </TabsContent>

    <TabsContent value="ranking" className="mt-0">
      <Tabs defaultValue="valore-call" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="valore-call">Valore call / lead</TabsTrigger>
          <TabsTrigger value="config">Configurazione classifica</TabsTrigger>
        </TabsList>
        <TabsContent value="valore-call" className="mt-0">
          <ValoreCallView />
        </TabsContent>
        <TabsContent value="config" className="mt-0">
          <RankingSettingsSection />
        </TabsContent>
      </Tabs>
    </TabsContent>

    <TabsContent value="automations" className="mt-0">
      <AutomationSettings />
    </TabsContent>

    <TabsContent value="roundrobin" className="mt-0">
      <RoundRobinFixSection />
    </TabsContent>

    <TabsContent value="fontemapping" className="mt-0 space-y-6">
      <FonteMappingSettings />
      <CallFonteGroupSettings />
    </TabsContent>
  </>
);

export default Settings;
