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
    await new Promise(r => setTimeout(r, 200));
    return html2canvas(el, {
      backgroundColor: getComputedStyle(document.body).backgroundColor || "#ffffff",
      scale: 2,
      useCORS: true,
      logging: false,
      // Use the full rendered size, not viewport
      width: el.scrollWidth,
      height: el.scrollHeight,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
      // Clone modification: expand any scrollable/max-height containers so nothing is clipped
      onclone: (clonedDoc: Document) => {
        // Remove max-height + overflow constraints on all cloned nodes
        const all = clonedDoc.querySelectorAll<HTMLElement>('*');
        all.forEach((node) => {
          const cs = clonedDoc.defaultView?.getComputedStyle(node);
          if (!cs) return;
          const overflow = cs.overflow + cs.overflowX + cs.overflowY;
          if (/auto|scroll|hidden/.test(overflow)) {
            node.style.overflow = 'visible';
            node.style.overflowX = 'visible';
            node.style.overflowY = 'visible';
          }
          if (cs.maxHeight && cs.maxHeight !== 'none') {
            node.style.maxHeight = 'none';
          }
          if (cs.height && /^\d+px$/.test(cs.height) && parseInt(cs.height) < node.scrollHeight) {
            node.style.height = 'auto';
          }
        });
      },
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

      // A4 dimensions (mm)
      const A4_W = 210;
      const A4_H = 297;
      const MARGIN = 8; // mm
      const usableW = A4_W - MARGIN * 2;
      const usableH = A4_H - MARGIN * 2;

      // Slice canvas into page-sized chunks (in canvas pixels)
      const pxPerMm = canvas.width / usableW;
      const sliceHeightPx = Math.floor(usableH * pxPerMm);

      const pdf = new jsPDF("p", "mm", "a4");
      let renderedPx = 0;
      let firstPage = true;

      while (renderedPx < canvas.height) {
        const remaining = canvas.height - renderedPx;
        const currentSlicePx = Math.min(sliceHeightPx, remaining);

        // Create temporary canvas for the slice
        const slice = document.createElement("canvas");
        slice.width = canvas.width;
        slice.height = currentSlicePx;
        const ctx = slice.getContext("2d");
        if (ctx) {
          ctx.drawImage(canvas, 0, renderedPx, canvas.width, currentSlicePx, 0, 0, canvas.width, currentSlicePx);
        }
        const sliceMmHeight = currentSlicePx / pxPerMm;

        if (!firstPage) pdf.addPage();
        firstPage = false;
        pdf.addImage(slice.toDataURL("image/png"), "PNG", MARGIN, MARGIN, usableW, sliceMmHeight);

        renderedPx += currentSlicePx;
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
