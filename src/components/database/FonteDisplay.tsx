
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";

interface FonteDisplayProps {
  fonte: string | null;
  className?: string;
}

const FonteDisplay = ({ fonte, className = "" }: FonteDisplayProps) => {
  const [showAll, setShowAll] = useState(false);

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
      {fonti.length > 1 && (
        <>
          {showAll ? (
            <>
              {fonti.slice(1).map((f, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {f}
                </Badge>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => setShowAll(false)}
              >
                <Minus className="h-3 w-3" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => setShowAll(true)}
            >
              <Plus className="h-3 w-3" />
              <span className="text-xs ml-1">{fonti.length - 1}</span>
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default FonteDisplay;
