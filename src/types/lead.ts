
export interface Lead {
  id?: string;
  data_generazione: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  assegnato?: boolean;
  venditore?: string;
  campagna?: string;
}
