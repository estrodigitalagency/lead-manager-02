import { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { MoreHorizontal, Edit, Trash2, GripVertical } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LeadAssignmentAutomation } from "@/types/automation";

interface AutomationListProps {
  automations: LeadAssignmentAutomation[];
  onToggle: (id: string, attivo: boolean) => void;
  onEdit: (automation: LeadAssignmentAutomation) => void;
  onDelete: (id: string) => void;
  onReorder: (result: any) => void;
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
  assign_to_previous_seller: "Assegna al venditore precedente"
};

export function AutomationList({ automations, onToggle, onEdit, onDelete, onReorder }: AutomationListProps) {
  const [isDragging, setIsDragging] = useState(false);

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
                     <CardContent className="p-3 sm:p-4">
                       <div className="space-y-3">
                         {/* Header with title, badge and controls */}
                         <div className="flex items-start justify-between">
                           <div className="flex items-start space-x-2 flex-1">
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
                         <div className="text-xs sm:text-sm text-muted-foreground space-y-2 pl-7">
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