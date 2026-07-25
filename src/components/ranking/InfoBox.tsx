import { Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InfoBoxProps {
  text: string;
}

export const InfoBox = ({ text }: InfoBoxProps) => {
  if (!text.trim()) return null;

  return (
    <Card className="border-primary/40 bg-primary/5 my-6">
      <CardHeader className="pb-2">
        <CardTitle className="font-display text-base flex items-center gap-2 text-primary">
          <Info className="w-5 h-5" />
          Informazioni Importanti
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-foreground/90 leading-relaxed">
          {text.split("\n").map((line, i) => (
            <p key={i} className={line.trim() ? "" : "h-2"}>
              {line}
            </p>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
