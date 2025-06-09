
import { CardContent } from "@/components/ui/card";
import { useSalespeopleData } from "@/hooks/useSalespeopleData";
import AddSalespersonForm from "./salespeople/AddSalespersonForm";
import SalespersonList from "./salespeople/SalespersonList";

const SalespeopleSettings = () => {
  const { venditori, isLoading, refetch } = useSalespeopleData();

  if (isLoading) {
    return <div className="flex justify-center p-8">Caricamento...</div>;
  }

  return (
    <CardContent className="space-y-6">
      <AddSalespersonForm onSuccess={refetch} />
      <SalespersonList venditori={venditori} onUpdate={refetch} />
    </CardContent>
  );
};

export default SalespeopleSettings;
