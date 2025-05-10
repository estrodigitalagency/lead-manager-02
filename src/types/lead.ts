
export interface Lead {
  id?: string;
  created_at: string;
  nome: string;
  email: string;
  telefono: string;
  assignable?: boolean;
  booked_call?: string; // 'SI' o 'NO'
  venditore?: string;
  campagna?: string;
  note?: string;
  stato?: string;
  updated_at?: string;
  // La colonna cognome è stata rimossa perché non esiste nella tabella
}
