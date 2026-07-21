import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, FileImage, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ExportReportButtonProps {
  targetRef: React.RefObject<HTMLElement>;
  filenameBase?: string;
}

const ExportReportButton = ({ targetRef, filenameBase = "report" }: ExportReportButtonProps) => {
  const [isExporting, setIsExporting] = useState(false);

  const captureAsCanvas = async () => {
    const html2canvas = (await import("html2canvas")).default;
    const el = targetRef.current;
    if (!el) throw new Error("Elemento report non trovato");
    // Wait a tick to let charts settle
    await new Promise(r => setTimeout(r, 100));
    return html2canvas(el, {
      backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });
  };

  const stamp = () => {
    const d = new Date();
    return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}_${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const exportPng = async () => {
    setIsExporting(true);
    try {
      const canvas = await captureAsCanvas();
      const link = document.createElement("a");
      link.download = `${filenameBase}_${stamp()}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
      toast.success("Report esportato in PNG");
    } catch (err) {
      console.error(err);
      toast.error("Errore export PNG");
    } finally {
      setIsExporting(false);
    }
  };

  const exportPdf = async () => {
    setIsExporting(true);
    try {
      const canvas = await captureAsCanvas();
      const { jsPDF } = await import("jspdf");
      const imgWidth = 210; // A4 mm
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      const pdf = new jsPDF("p", "mm", "a4");
      let position = 0;
      let heightLeft = imgHeight;
      const imgData = canvas.toDataURL("image/png");

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${filenameBase}_${stamp()}.pdf`);
      toast.success("Report esportato in PDF");
    } catch (err) {
      console.error(err);
      toast.error("Errore export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={isExporting}>
          {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Esporta
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportPng}>
          <FileImage className="h-4 w-4 mr-2" /> PNG (immagine)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportPdf}>
          <FileText className="h-4 w-4 mr-2" /> PDF (documento)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportReportButton;
