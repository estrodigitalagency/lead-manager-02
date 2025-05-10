
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Control } from "react-hook-form";

interface CampaignFieldProps {
  control: Control<any>;
}

const CampaignField = ({ control }: CampaignFieldProps) => {
  return (
    <FormField
      control={control}
      name="campagna"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Campagna</FormLabel>
          <FormControl>
            <Input placeholder="Inserisci la campagna (opzionale)" {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CampaignField;
