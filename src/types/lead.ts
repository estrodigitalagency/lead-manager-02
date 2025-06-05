
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
  note?: string;
  stato?: string;
  updated_at?: string;
}
