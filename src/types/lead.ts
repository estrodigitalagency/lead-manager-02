
export interface Lead {
  id?: string;
  created_at: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  assignable?: boolean;
  booked_call?: string; // 'SI' o 'NO'
  venditore?: string;
  campagna?: string;
  fonte?: string;
  ultima_fonte?: string;
  lead_score?: number;
  stato?: string;
  stato_del_lead?: string;
  updated_at?: string;
  data_assegnazione?: string;
  manually_not_assignable?: boolean;
  market?: string;
}
