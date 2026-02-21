
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const tabItems = [
  { value: "database", icon: Database, label: "Database" },
  { value: "attribution", icon: Webhook, label: "Attribuzione" },
  { value: "webhooks", icon: Webhook, label: "Webhook" },
  { value: "salespeople", icon: Users, label: "Venditori" },
  { value: "campaigns", icon: Tag, label: "Campagne" },
  { value: "automations", icon: Zap, label: "Automazioni" },
  { value: "roundrobin", icon: RefreshCw, label: "Round Robin" },
  { value: "fontemapping", icon: ArrowRightLeft, label: "Mapping" },
];

const Settings = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className={`w-full min-h-screen px-4 py-8 max-w-7xl mx-auto ${isMobile ? 'pt-16 pb-24 px-2' : 'pt-20'}`}>
      <Tabs defaultValue="attribution" className="w-full min-w-0">
        <div className="min-w-0">
          <TabsList className={`${isMobile ? 'grid grid-cols-4 gap-1 h-auto p-1' : 'grid w-full grid-cols-8'} mb-6 border`}>
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={`data-[state=active]:text-primary active:scale-95 transition-all ${
                    isMobile 
                      ? 'flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] leading-tight min-h-[52px]' 
                      : ''
                  }`}
                >
                  <Icon className={`${isMobile ? 'h-4 w-4' : 'h-4 w-4 mr-2'}`} />
                  <span className={isMobile ? 'truncate w-full text-center' : ''}>{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
          
          <div className="min-w-0 overflow-hidden">
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
          </div>
        </div>
      </Tabs>
    </div>
  );
};

export default Settings;
