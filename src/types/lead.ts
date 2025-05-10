
export interface Lead {
  id?: string;
  created_at: string;
  nome: string;
  cognome?: string;
  email: string;
  telefono: string;
  assignable?: boolean;
  booked_call?: boolean;
  venditore?: string;
  campagna?: string;
  note?: string;
  stato?: string;
}
