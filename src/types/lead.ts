
export interface Lead {
  id?: string;
  created_at: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  assegnabile?: boolean;
  venditore?: string;
  campagna?: string;
  booked_call?: string;
}
