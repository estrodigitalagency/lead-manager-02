
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Control } from "react-hook-form";

interface LeadCountFieldProps {
  control: Control<any>;
  maxLeads: number;
}

const LeadCountField = ({ control, maxLeads }: LeadCountFieldProps) => {
  return (
    <FormField
      control={control}
      name="numLead"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Numero di lead *</FormLabel>
          <FormControl>
            <Input
              type="number"
              placeholder="Inserisci il numero di lead"
              {...field}
              max={maxLeads}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default LeadCountField;
