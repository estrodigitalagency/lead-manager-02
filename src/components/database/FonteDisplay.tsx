
import { Badge } from "@/components/ui/badge";

interface FonteDisplayProps {
  fonte: string | null;
  className?: string;
}

const FonteDisplay = ({ fonte, className = "" }: FonteDisplayProps) => {
  if (!fonte) return <span className={className}>-</span>;

  const fonti = fonte.split(',').map(f => f.trim()).filter(f => f);
  
  if (fonti.length === 0) return <span className={className}>-</span>;
  
  if (fonti.length === 1) {
    return (
      <Badge variant="outline" className={`text-xs ${className}`}>
        {fonti[0]}
      </Badge>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <Badge variant="outline" className="text-xs">
        {fonti[0]}
      </Badge>
      <span className="text-xs text-muted-foreground">
        +{fonti.length - 1}
      </span>
    </div>
  );
};

export default FonteDisplay;
