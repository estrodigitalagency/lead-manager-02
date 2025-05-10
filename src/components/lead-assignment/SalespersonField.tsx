
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Control } from "react-hook-form";

interface SalespersonFieldProps {
  control: Control<any>;
  salespeople: string[];
}

const SalespersonField = ({ control, salespeople }: SalespersonFieldProps) => {
  return (
    <FormField
      control={control}
      name="venditore"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Venditore *</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona un venditore" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {salespeople.length > 0 ? (
                salespeople.map((person) => (
                  <SelectItem key={person} value={person}>
                    {person}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  Nessun venditore disponibile
                </SelectItem>
              )}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default SalespersonField;
