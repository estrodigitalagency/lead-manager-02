
export interface Lead {
  id?: string;
  dataGenerazione: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  assegnato?: boolean;
  venditore?: string;
  campagna?: string;
}
