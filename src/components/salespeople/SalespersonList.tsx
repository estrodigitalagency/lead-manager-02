
import { Venditore } from "@/types/venditore";
import SalespersonCard from "./SalespersonCard";

interface SalespersonListProps {
  venditori: Venditore[];
  onUpdate: () => void;
}

const SalespersonList = ({ venditori, onUpdate }: SalespersonListProps) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Venditori Esistenti</h3>
      
      {venditori.length === 0 ? (
        <p className="text-muted-foreground text-center py-8">
          Nessun venditore configurato
        </p>
      ) : (
        <div className="space-y-4">
          {venditori.map((venditore) => (
            <SalespersonCard 
              key={venditore.id} 
              venditore={venditore} 
              onUpdate={onUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SalespersonList;
