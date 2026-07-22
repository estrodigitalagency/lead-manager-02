
import { Card } from "@/components/ui/card";
import { useSalespeopleData } from "@/hooks/useSalespeopleData";
import AddSalespersonForm from "./salespeople/AddSalespersonForm";
import SalespersonList from "./salespeople/SalespersonList";

const SalespeopleSettings = () => {
  const { venditori, isLoading, refetch } = useSalespeopleData();

  if (isLoading) {
    return <div className="flex justify-center p-8 text-sm text-muted-foreground">Caricamento...</div>;
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <AddSalespersonForm onSuccess={refetch} />
      </Card>
      <SalespersonList venditori={venditori} onUpdate={refetch} />
    </div>
  );
};

export default SalespeopleSettings;
