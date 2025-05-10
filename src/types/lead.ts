
export interface Lead {
  id?: string;
  created_at: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  assegnato?: boolean;
  venditore?: string;
  campagna?: string;
  booked_call?: string;
}
