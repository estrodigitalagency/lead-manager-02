
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from "@/components/ui/select";
import { Webhook, ArrowRightLeft, Users, Database, Tag, Zap, RefreshCw } from "lucide-react";
import SalespeopleSettings from "@/components/SalespeopleSettings";
import CampaignsSettings from "@/components/CampaignsSettings";
import DatabaseSection from "@/components/settings/DatabaseSection";
import AttributionWindowSettings from "@/components/settings/AttributionWindowSettings";
import WebhookSettings from "@/components/settings/WebhookSettings";
import { AutomationSettings } from "@/components/automation/AutomationSettings";
import { RoundRobinFixSection } from "@/components/settings/RoundRobinFixSection";
import FonteMappingSettings from "@/components/settings/FonteMappingSettings";
import { useIsMobile } from "@/hooks/use-mobile";

const sections = [
  {
    group: "Team",
    items: [
      { value: "salespeople", icon: Users, label: "Venditori" },
      { value: "campaigns", icon: Tag, label: "Campagne" },
      { value: "roundrobin", icon: RefreshCw, label: "Round Robin" },
    ]
  },
  {
    group: "Automazioni",
    items: [
      { value: "attribution", icon: Webhook, label: "Attribuzione" },
      { value: "automations", icon: Zap, label: "Automazioni" },
      { value: "webhooks", icon: Webhook, label: "Webhook" },
      { value: "fontemapping", icon: ArrowRightLeft, label: "Mapping Fonte" },
    ]
  },
  {
    group: "Sistema",
    items: [
      { value: "database", icon: Database, label: "Database" },
    ]
  }
];

const allItems = sections.flatMap(s => s.items);

const Settings = () => {
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState("attribution");

  const activeItem = allItems.find(item => item.value === activeTab);
  const ActiveIcon = activeItem?.icon;

  return (
    <div className={`w-full min-h-screen max-w-7xl mx-auto ${isMobile ? 'pt-16 pb-24 px-4' : 'pt-[72px] px-6 py-8'}`}>
      <h1 className="text-xl md:text-2xl font-semibold text-foreground mb-5">Impostazioni</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" orientation={isMobile ? "horizontal" : "vertical"}>
        {isMobile ? (
          /* Mobile: dropdown selector instead of cramped tabs */
          <div className="mb-4">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full h-11 rounded-xl">
                <div className="flex items-center gap-2">
                  {ActiveIcon && <ActiveIcon className="h-4 w-4 text-primary" />}
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectGroup key={section.group}>
                    <SelectLabel className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {section.group}
                    </SelectLabel>
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
          /* Desktop: vertical sidebar with grouped sections */
          <div className="flex gap-6 min-h-[600px]">
            <div className="w-56 flex-shrink-0 space-y-4">
              {sections.map((section) => (
                <div key={section.group}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 px-2">
                    {section.group}
                  </p>
                  <TabsList className="flex flex-col h-auto w-full bg-transparent p-0 gap-0.5">
                    {section.items.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <TabsTrigger
                          key={tab.value}
                          value={tab.value}
                          className="w-full justify-start gap-2.5 px-3 py-2 h-9 text-sm font-normal text-muted-foreground data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:font-medium hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors"
                        >
                          <Icon className="h-4 w-4 flex-shrink-0" />
                          {tab.label}
                        </TabsTrigger>
                      );
                    })}
                  </TabsList>
                </div>
              ))}
            </div>

            <div className="flex-1 min-w-0">
              <SettingsContent />
            </div>
          </div>
        )}

        {isMobile && <SettingsContent />}
      </Tabs>
    </div>
  );
};

const SettingsContent = () => (
  <>
    <TabsContent value="database">
      <DatabaseSection />
    </TabsContent>

    <TabsContent value="attribution">
      <AttributionWindowSettings />
    </TabsContent>

    <TabsContent value="webhooks">
      <WebhookSettings />
    </TabsContent>

    <TabsContent value="salespeople">
      <Card className="border">
        <SalespeopleSettings />
      </Card>
    </TabsContent>

    <TabsContent value="campaigns">
      <Card className="border">
        <CampaignsSettings />
      </Card>
    </TabsContent>

    <TabsContent value="automations">
      <AutomationSettings />
    </TabsContent>

    <TabsContent value="roundrobin">
      <RoundRobinFixSection />
    </TabsContent>

    <TabsContent value="fontemapping">
      <FonteMappingSettings />
    </TabsContent>
  </>
);

export default Settings;
