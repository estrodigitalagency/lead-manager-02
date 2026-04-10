
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";

interface CSVFileUploaderProps {
  onFileChange: (file: File, headers: string[]) => void;
}

export default function CSVFileUploader({ onFileChange }: CSVFileUploaderProps) {
  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Parse CSV headers
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          const lines = content.split('\n');
          if (lines.length > 0) {
            const csvHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
            onFileChange(selectedFile, csvHeaders);
          }
        }
      };
      reader.readAsText(selectedFile);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <Label htmlFor="csvFile" className="w-full text-center">
        Seleziona un file CSV
      </Label>
      <div className="border-2 border-dashed border-border rounded-lg p-6 w-full flex flex-col items-center">
        <Upload className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground mb-4">Trascina qui il file o clicca per sfogliare</p>
        <input
          id="csvFile"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={handleFileChange}
        />
        <Button onClick={() => document.getElementById('csvFile')?.click()}>
          Seleziona File
        </Button>
      </div>
    </div>
  );
}
