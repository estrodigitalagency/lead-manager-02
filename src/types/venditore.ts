
export interface Venditore {
  id: string;
  nome: string;
  cognome: string;
  email?: string;
  telefono?: string;
  sheets_file_id: string;
  sheets_tab_name: string;
  stato: 'attivo' | 'inattivo';
  created_at: string;
}

export interface NewVenditoreForm {
  nome: string;
  cognome: string;
  email: string;
  telefono: string;
  sheets_file_id: string;
  sheets_tab_name: string;
}
