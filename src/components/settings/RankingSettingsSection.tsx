import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Check, Users, Link as LinkIcon, Star, Trash2, Plus, Image, GripVertical, Info, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { fetchSettings, saveSetting, getRankingBaseUrl } from "@/lib/ranking/adminConfig";
import { generateMemberCode } from "@/lib/ranking/hashUtils";
import { fetchSheetData, TeamMember } from "@/lib/ranking/googleSheets";

const RankingSettingsSection = () => {
  const [sheetUrl, setSheetUrl] = useState("");
  const [maxRank, setMaxRank] = useState(0);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [hofImages, setHofImages] = useState<string[]>([]);
  const [infoBox, setInfoBox] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  useEffect(() => {
    fetchSettings().then((s) => {
      if (s.sheet_url) setSheetUrl(s.sheet_url);
      if (s.max_rank) setMaxRank(parseInt(s.max_rank, 10) || 0);
      if (s.info_box) setInfoBox(s.info_box);
      if (s.hof_images) {
        try { setHofImages(JSON.parse(s.hof_images)); } catch { /* */ }
      }
    }).catch(() => {});
  }, []);

  const loadMembers = useCallback(async () => {
    if (!sheetUrl) return;
    try {
      const data = await fetchSheetData(sheetUrl);
      setMembers(data);
    } catch { /* silent */ }
  }, [sheetUrl]);

  useEffect(() => { if (sheetUrl) loadMembers(); }, [sheetUrl, loadMembers]);

  const saveSheet = async () => {
    const ok = await saveSetting("sheet_url", sheetUrl);
    if (ok) { toast.success("URL foglio salvato"); loadMembers(); }
    else toast.error("Errore nel salvataggio");
  };

  const saveMaxRank = async () => {
    const ok = await saveSetting("max_rank", maxRank.toString());
    if (ok) toast.success(`Limite classifica: ${maxRank === 0 ? "tutti" : `top ${maxRank}`}`);
    else toast.error("Errore nel salvataggio");
  };

  const saveHofImages = async (images: string[]) => {
    setHofImages(images);
    await saveSetting("hof_images", JSON.stringify(images));
  };

  const addHofImage = async () => {
    if (!newImageUrl.trim()) return;
    await saveHofImages([...hofImages, newImageUrl.trim()]);
    setNewImageUrl("");
    toast.success("Immagine aggiunta");
  };

  const removeHofImage = async (idx: number) => {
    await saveHofImages(hofImages.filter((_, i) => i !== idx));
    toast.success("Immagine rimossa");
  };

  const driveUrlToEmbed = (url: string): string => {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match ? `https://lh3.googleusercontent.com/d/${match[1]}` : url;
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDrop = async (idx: number) => {
    if (dragIdx === null || dragIdx === idx) { setDragIdx(null); setDragOverIdx(null); return; }
    const updated = [...hofImages];
    const [moved] = updated.splice(dragIdx, 1);
    updated.splice(idx, 0, moved);
    await saveHofImages(updated);
    setDragIdx(null); setDragOverIdx(null);
  };
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };

  const copyLink = (name: string, idx: number) => {
    const link = `${getRankingBaseUrl()}?m=${generateMemberCode(name)}`;
    navigator.clipboard.writeText(link);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
    toast.success(`Link copiato per ${name}`);
  };

  return (
    <div className="space-y-4">
      <a href="/ranking" target="_blank" rel="noopener noreferrer">
        <Button variant="outline" size="sm">
          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Apri classifica pubblica
        </Button>
      </a>

      {/* Foglio Google */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-primary" /> Configurazione foglio
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>URL Google Sheets</Label>
          <Input
            placeholder="https://docs.google.com/spreadsheets/d/..."
            value={sheetUrl}
            onChange={(e) => setSheetUrl(e.target.value)}
          />
          <p className="text-[11px] text-muted-foreground">
            Il foglio deve avere una tab <code>Ranking_Data</code> con colonne: nome, fatturato, incassato, CR, valore call. Deve essere condiviso pubblicamente (chiunque con il link).
          </p>
          <Button onClick={saveSheet} size="sm">Salva URL</Button>
        </CardContent>
      </Card>

      {/* Limite classifica */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" /> Limite classifica
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Quanti classificati mostrare (0 = tutti)</Label>
          <Input
            type="number"
            min={0}
            value={maxRank}
            onChange={(e) => setMaxRank(parseInt(e.target.value) || 0)}
            className="w-32"
          />
          <Button onClick={saveMaxRank} size="sm">Salva limite</Button>
        </CardContent>
      </Card>

      {/* Info box */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" /> Informazioni importanti
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Testo del box informativo (visibile sulla pagina pubblica)</Label>
          <Textarea
            placeholder="Scrivi qui le informazioni importanti..."
            value={infoBox}
            onChange={(e) => setInfoBox(e.target.value)}
            rows={5}
          />
          <Button
            size="sm"
            onClick={async () => {
              const ok = await saveSetting("info_box", infoBox);
              if (ok) toast.success("Informazioni salvate");
              else toast.error("Errore nel salvataggio");
            }}
          >
            Salva informazioni
          </Button>
        </CardContent>
      </Card>

      {/* Link personali */}
      {members.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Copy className="w-4 h-4 text-primary" /> Link personali ({members.length} membri)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {members.map((m, i) => (
              <div key={m.name} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5">
                <span className="text-[13px] font-medium text-foreground truncate">{m.name}</span>
                <Button variant="ghost" size="sm" onClick={() => copyLink(m.name, i)} className="shrink-0 h-7">
                  {copiedIdx === i ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Hall of Fame */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="w-4 h-4 text-primary" /> Hall of Fame
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Link Google Drive immagine..."
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addHofImage()}
            />
            <Button onClick={addHofImage} size="icon" className="shrink-0">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          {hofImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {hofImages.map((url, i) => (
                <div
                  key={i}
                  draggable
                  onDragStart={() => handleDragStart(i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={() => handleDrop(i)}
                  onDragEnd={handleDragEnd}
                  className={`relative group rounded-md overflow-hidden border transition-all cursor-grab active:cursor-grabbing ${
                    dragOverIdx === i ? "border-primary scale-105" : "border-border"
                  } ${dragIdx === i ? "opacity-50" : ""}`}
                >
                  <div className="absolute top-1 left-1 z-10 bg-background/80 rounded p-0.5">
                    <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <img
                    src={driveUrlToEmbed(url)}
                    alt={`HoF ${i + 1}`}
                    className="w-full h-28 object-cover pointer-events-none"
                    referrerPolicy="no-referrer"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => removeHofImage(i)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12.5px] text-muted-foreground flex items-center gap-2">
              <Image className="w-4 h-4" /> Nessuna immagine aggiunta
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RankingSettingsSection;
