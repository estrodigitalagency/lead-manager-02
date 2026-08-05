export interface TeamMember {
  name: string;
  fatturato: number;
  incassato: number;
  cr: number;
  valoreCall: number;
}

export interface RankedMember extends TeamMember {
  rank: number;
  // Dettaglio opzionale (ranking per fonte): media mensile e valore del mese più recente,
  // mostrati sotto il totale cumulato (3 mesi utili).
  sub?: { avg: number; current: number; mese: string };
}

export type MetricKey = "fatturato" | "incassato" | "cr" | "valoreCall";

export const METRIC_LABELS: Record<MetricKey, { label: string; icon: string; format: (v: number) => string }> = {
  fatturato: {
    label: "Fatturato",
    icon: "💰",
    format: (v) => `€${v.toLocaleString("it-IT")}`,
  },
  incassato: {
    label: "Incassato",
    icon: "💵",
    format: (v) => `€${v.toLocaleString("it-IT")}`,
  },
  cr: {
    label: "CR",
    icon: "📊",
    format: (v) => `${v.toFixed(1)}%`,
  },
  valoreCall: {
    label: "Valore Call",
    icon: "📞",
    format: (v) => `€${v.toLocaleString("it-IT")}`,
  },
};

function parseNumber(val: string): number {
  // Remove currency symbols, spaces, and handle Italian number format
  const cleaned = val.replace(/[€$£\s]/g, "").replace(/\./g, "").replace(",", ".").replace("%", "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

export function extractSheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

export function buildCsvUrl(sheetId: string, sheetName = "Ranking_Data"): string {
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}`;
}

export interface SheetConfig {
  maxRank: number;
  hofImages: string[];
}

export async function fetchConfigData(sheetUrl: string): Promise<SheetConfig> {
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) return { maxRank: 0, hofImages: [] };

  const csvUrl = buildCsvUrl(sheetId, "Config");
  try {
    const response = await fetch(csvUrl);
    if (!response.ok) return { maxRank: 0, hofImages: [] };

    const text = await response.text();
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

    let maxRank = 0;
    const hofImages: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvLine(lines[i]);
      if (cols.length < 2) continue;
      const key = cols[0].toLowerCase().trim();
      const value = cols[1].trim();
      if (key === "max_rank") {
        maxRank = parseInt(value, 10) || 0;
      } else if (key === "hof_image" && value) {
        hofImages.push(value);
      }
    }

    return { maxRank, hofImages };
  } catch {
    return { maxRank: 0, hofImages: [] };
  }
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export async function fetchSheetData(sheetUrl: string): Promise<TeamMember[]> {
  const sheetId = extractSheetId(sheetUrl);
  if (!sheetId) throw new Error("URL del foglio Google non valido");

  const csvUrl = buildCsvUrl(sheetId);
  const response = await fetch(csvUrl);
  if (!response.ok) throw new Error("Impossibile caricare i dati dal foglio Google");

  const text = await response.text();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  if (lines.length < 2) throw new Error("Il foglio non contiene dati sufficienti");

  const members: TeamMember[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length >= 9 && cols[0]) {
      members.push({
        name: cols[0],
        fatturato: parseNumber(cols[2]),
        incassato: parseNumber(cols[4]),
        cr: parseNumber(cols[6]),
        valoreCall: parseNumber(cols[8]),
      });
    }
  }

  return members;
}

export function rankByMetric(members: TeamMember[], metric: MetricKey): RankedMember[] {
  return [...members]
    .sort((a, b) => b[metric] - a[metric])
    .map((m, i) => ({ ...m, rank: i + 1 }));
}
