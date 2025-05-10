
import { Form } from "@/components/ui/form";
import { Loader2 } from "lucide-react";
import AssignmentFormHeader from "./lead-assignment/AssignmentFormHeader";
import LeadCountField from "./lead-assignment/LeadCountField";
import SalespersonField from "./lead-assignment/SalespersonField";
import CampaignField from "./lead-assignment/CampaignField";
import SubmitButton from "./lead-assignment/SubmitButton";
import { useAssignmentForm } from "./lead-assignment/useAssignmentForm";

interface LeadAssignmentFormProps {
  onAssignmentSuccess: () => void;
}

const LeadAssignmentForm = ({ onAssignmentSuccess }: LeadAssignmentFormProps) => {
  const {
    form,
    salespeople,
    availableLeads,
    isLoading,
    isFetchingData,
    onSubmit
  } = useAssignmentForm(onAssignmentSuccess);

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
      <AssignmentFormHeader availableLeads={availableLeads} />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <LeadCountField control={form.control} maxLeads={availableLeads.length} />
          <SalespersonField control={form.control} salespeople={salespeople} />
          <CampaignField control={form.control} />
          <SubmitButton 
            isLoading={isLoading} 
            isDisabled={availableLeads.length === 0} 
          />
        </form>
      </Form>
    </div>
  );
};

export default LeadAssignmentForm;
