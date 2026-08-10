import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MoreHorizontal, Edit, Trash2, GripVertical, RotateCcw, Users, PauseCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LeadAssignmentAutomation } from "@/types/automation";
import { Progress } from "@/components/ui/progress";

interface VenditoreLite {
  id: string;
  nome: string;
  cognome: string;
  stato: string;
}

interface AutomationListProps {
  automations: LeadAssignmentAutomation[];
  onToggle: (id: string, attivo: boolean) => void;
  codaIds?: string[];
  onToggleCoda?: (id: string, attiva: boolean) => void;
  onEdit: (automation: LeadAssignmentAutomation) => void;
  onDelete: (id: string) => void;
  onReorder: (result: any) => void;
  onResetDistribution?: (id: string) => Promise<void> | void;
  venditori?: VenditoreLite[];
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
  contains: "contiene",
  equals: "è uguale a",
  starts_with: "inizia con",
  ends_with: "finisce con",
  not_contains: "non contiene"
};

const actionTypeLabels = {
  assign_to_seller: "Assegna a venditore specifico",
  assign_to_previous_seller: "Assegna al venditore precedente",
  weighted_distribution: "Distribuzione tra più venditori (%/quota)"
};

export function AutomationList({ automations, onToggle, onEdit, onDelete, onReorder, onResetDistribution, venditori = [], codaIds = [], onToggleCoda }: AutomationListProps) {
  const [isDragging, setIsDragging] = useState(false);

  const nameOf = (id: string) => {
    const v = venditori.find(x => x.id === id);
    return v ? `${v.nome} ${v.cognome}` : id.slice(0, 8);
  };

  const handleReset = async (automation: LeadAssignmentAutomation) => {
    if (!onResetDistribution) return;
    if (!confirm(`Azzerare tutti i contatori di distribuzione per "${automation.nome}"? I limiti individuali/quote ripartiranno da zero.`)) return;
    await onResetDistribution(automation.id);
  };

  const handleDragEnd = (result: any) => {
    setIsDragging(false);
    if (!result.destination) return;
    onReorder(result);
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  if (automations.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Nessuna automazione configurata.
          <br />
          Crea la tua prima automazione per iniziare.
        </CardContent>
      </Card>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd} onDragStart={handleDragStart}>
      <Droppable droppableId="automations">
        {(provided, snapshot) => (
          <div
            {...provided.droppableProps}
            ref={provided.innerRef}
            className={`space-y-3 ${snapshot.isDraggingOver ? 'bg-muted/20 rounded-lg p-2' : ''}`}
          >
            {automations.map((automation, index) => (
              <Draggable key={automation.id} draggableId={automation.id} index={index}>
                {(provided, snapshot) => (
                  <Card
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={`transition-all ${
                      snapshot.isDragging 
                        ? 'shadow-lg scale-[1.02] rotate-2' 
                        : 'hover:shadow-md'
                    } ${
                      !automation.attivo ? 'opacity-60' : ''
                    }`}
                  >
                     <CardContent className="p-3 sm:p-4 min-w-0 overflow-hidden">
                       <div className="space-y-3">
                         {/* Header with title, badge and controls */}
                         <div className="flex items-start justify-between min-w-0">
                           <div className="flex items-start space-x-2 flex-1 min-w-0">
                             <div
                               {...provided.dragHandleProps}
                               className="flex flex-col items-center text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing mt-1 touch-manipulation"
                             >
                               <GripVertical className="h-5 w-5 sm:h-4 sm:w-4" />
                               <span className="text-xs font-mono bg-muted px-1 rounded">{automation.priority}</span>
                             </div>

                             <div className="flex-1 min-w-0">
                               <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                 <h3 className="font-medium text-sm sm:text-base truncate">{automation.nome}</h3>
                                 <Badge variant={automation.attivo ? "default" : "secondary"} className="self-start">
                                   {automation.attivo ? "Attiva" : "Inattiva"}
                                 </Badge>
                                 {codaIds.includes(automation.id) && (
                                   <Badge variant="outline" className="self-start border-destructive bg-destructive/15 text-destructive font-semibold">
                                     Lead nuovi in coda
                                   </Badge>
                                 )}
                               </div>
                             </div>
                           </div>

                           <div className="flex items-start space-x-2 ml-2">
                             <Switch
                               checked={automation.attivo}
                               onCheckedChange={(checked) => onToggle(automation.id, checked)}
                               className="touch-manipulation"
                             />
                             
                             <DropdownMenu>
                               <DropdownMenuTrigger asChild>
                                 <Button variant="ghost" size="sm" className="h-8 w-8 p-0 touch-manipulation">
                                   <MoreHorizontal className="h-4 w-4" />
                                 </Button>
                               </DropdownMenuTrigger>
                               <DropdownMenuContent align="end">
                                 <DropdownMenuItem onClick={() => onEdit(automation)}>
                                   <Edit className="h-4 w-4 mr-2" />
                                   Modifica
                                 </DropdownMenuItem>
                                 {onToggleCoda && (
                                   <DropdownMenuItem
                                     onClick={() => onToggleCoda(automation.id, !codaIds.includes(automation.id))}
                                     title="I lead nuovi restano in attesa come Round Robin; chi è già stato lavorato nel lock period torna al suo venditore"
                                   >
                                     <PauseCircle className="h-4 w-4 mr-2" />
                                     {codaIds.includes(automation.id)
                                       ? "Riprendi assegnazione normale"
                                       : "Metti i lead nuovi in coda"}
                                   </DropdownMenuItem>
                                 )}
                                 {automation.action_type === 'weighted_distribution' && onResetDistribution && (
                                   <DropdownMenuItem onClick={() => handleReset(automation)}>
                                     <RotateCcw className="h-4 w-4 mr-2" />
                                     Azzera contatori distribuzione
                                   </DropdownMenuItem>
                                 )}
                                 <DropdownMenuItem
                                   onClick={() => onDelete(automation.id)}
                                   className="text-destructive"
                                 >
                                   <Trash2 className="h-4 w-4 mr-2" />
                                   Elimina
                                 </DropdownMenuItem>
                               </DropdownMenuContent>
                             </DropdownMenu>
                           </div>
                         </div>

                         {/* Details - Mobile-friendly layout */}
                         <div className="text-xs sm:text-sm text-muted-foreground space-y-2 pl-7 min-w-0 whitespace-normal break-words overflow-hidden">
                           <div className="flex flex-col space-y-1">
                             <div>
                               <span className="font-medium text-foreground">Quando:</span>{" "}
                               <span className="break-words">
                                 {automation.trigger_when === 'new_lead' ? 'Nuovo Lead' : 'Lead Duplicato (Fonte Diversa)'}
                               </span>
                             </div>
                             <div>
                               <span className="font-medium text-foreground">Trigger:</span>{" "}
                               <span className="break-words">
                                 {triggerFieldLabels[automation.trigger_field]} {conditionTypeLabels[automation.condition_type]} "{automation.condition_value}"
                               </span>
                             </div>
                             <div>
                               <span className="font-medium text-foreground">Azione:</span>{" "}
                               <span className="break-words">
                                 {actionTypeLabels[automation.action_type]}
                                 {automation.sheets_tab_name && (
                                   <span className="block sm:inline"> → Tab: "{automation.sheets_tab_name}"</span>
                                 )}
                               </span>
                             </div>
                             {automation.excluded_sellers && automation.excluded_sellers.length > 0 && (
                               <div>
                                 <span className="font-medium text-foreground">Esclude:</span>{" "}
                                 <span className="break-words">
                                   {automation.excluded_sellers.join(", ")}
                                 </span>
                               </div>
                             )}
                           </div>

                           {/* Monitoring: distribuzione live counters */}
                           {automation.action_type === 'weighted_distribution' && automation.distribution_config && automation.distribution_config.length > 0 && (
                             <div className="mt-3 rounded-lg border bg-muted/20 p-3 space-y-2">
                               <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-2 text-foreground">
                                   <Users className="h-3.5 w-3.5 text-primary" />
                                   <span className="text-xs font-semibold uppercase tracking-wide">Distribuzione live</span>
                                 </div>
                                 <span className="text-[11px] text-muted-foreground">
                                   Totale: <strong className="text-foreground">{automation.distribution_state?.total_assigned || 0}</strong>
                                   {automation.distribution_state?.last_updated && (
                                     <span> · agg. {new Date(automation.distribution_state.last_updated).toLocaleString('it-IT')}</span>
                                   )}
                                 </span>
                               </div>
                               <div className="space-y-1.5">
                                 {automation.distribution_config.map((slot: any, i: number) => {
                                   const current = automation.distribution_state?.count_assigned?.[slot.venditore_id] || 0;
                                   const target = automation.distribution_mode === 'count' ? (slot.count_target || 0) : (slot.cap || 0);
                                   const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
                                   const full = target > 0 && current >= target;
                                   return (
                                     <div key={i} className="text-[11px] space-y-0.5">
                                       <div className="flex items-center justify-between gap-2">
                                         <span className={`font-medium ${full ? 'text-amber-600' : 'text-foreground'}`}>
                                           {nameOf(slot.venditore_id)}
                                           {automation.distribution_mode === 'percentage' && slot.weight != null && (
                                             <span className="ml-1.5 text-muted-foreground">({slot.weight}%)</span>
                                           )}
                                         </span>
                                         <span className={`tabular-nums ${full ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
                                           {current}{target > 0 ? ` / ${target}` : ''}
                                           {full && ' · PIENO'}
                                         </span>
                                       </div>
                                       {target > 0 && (
                                         <Progress value={pct} className="h-1" />
                                       )}
                                     </div>
                                   );
                                 })}
                               </div>
                             </div>
                           )}
                         </div>
                       </div>
                     </CardContent>
                  </Card>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}