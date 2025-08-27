
-- FASE 1: POLITICHE RLS PER RIPRISTINARE IL FUNZIONAMENTO PER UTENTI AUTENTICATI (admin/manager)
-- E TRIGGER DI POPOLAMENTO DEL PROFILO UTENTE

-- 1) Abilita RLS (idempotente: se già abilitato non crea problemi)
ALTER TABLE public.lead_generation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booked_call ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_lavorati ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.venditori ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignment_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_fonti ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.database_campagne ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;

-- 2) Crea policy per utenti autenticati con ruolo admin o manager
-- Nota: le policy esistenti "Admins only ..." restano in vigore (si sommano in OR).
-- Qui consentiamo anche ai manager (oltre agli admin) di operare dalle pagine del tool.

-- lead_generation
CREATE POLICY "Managers can select lead_generation"
ON public.lead_generation
FOR SELECT
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can insert lead_generation"
ON public.lead_generation
FOR INSERT
TO authenticated
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can update lead_generation"
ON public.lead_generation
FOR UPDATE
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'))
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can delete lead_generation"
ON public.lead_generation
FOR DELETE
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'));

-- booked_call
CREATE POLICY "Managers can select booked_call"
ON public.booked_call
FOR SELECT
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can insert booked_call"
ON public.booked_call
FOR INSERT
TO authenticated
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can update booked_call"
ON public.booked_call
FOR UPDATE
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'))
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can delete booked_call"
ON public.booked_call
FOR DELETE
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'));

-- lead_lavorati
CREATE POLICY "Managers can select lead_lavorati"
ON public.lead_lavorati
FOR SELECT
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can insert lead_lavorati"
ON public.lead_lavorati
FOR INSERT
TO authenticated
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can update lead_lavorati"
ON public.lead_lavorati
FOR UPDATE
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'))
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can delete lead_lavorati"
ON public.lead_lavorati
FOR DELETE
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'));

-- venditori
CREATE POLICY "Managers can select venditori"
ON public.venditori
FOR SELECT
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can insert venditori"
ON public.venditori
FOR INSERT
TO authenticated
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can update venditori"
ON public.venditori
FOR UPDATE
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'))
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can delete venditori"
ON public.venditori
FOR DELETE
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'));

-- assignment_history (la UI fa INSERT e SELECT)
CREATE POLICY "Managers can select assignment_history"
ON public.assignment_history
FOR SELECT
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can insert assignment_history"
ON public.assignment_history
FOR INSERT
TO authenticated
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

-- database_fonti (la UI fa SELECT e UPSERT)
CREATE POLICY "Managers can select database_fonti"
ON public.database_fonti
FOR SELECT
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can insert database_fonti"
ON public.database_fonti
FOR INSERT
TO authenticated
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can update database_fonti"
ON public.database_fonti
FOR UPDATE
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'))
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

-- database_campagne (SELECT e gestione da UI)
CREATE POLICY "Managers can select database_campagne"
ON public.database_campagne
FOR SELECT
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can insert database_campagne"
ON public.database_campagne
FOR INSERT
TO authenticated
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can update database_campagne"
ON public.database_campagne
FOR UPDATE
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'))
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

-- system_settings (la UI legge e scrive impostazioni)
CREATE POLICY "Managers can select system_settings"
ON public.system_settings
FOR SELECT
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can insert system_settings"
ON public.system_settings
FOR INSERT
TO authenticated
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can update system_settings"
ON public.system_settings
FOR UPDATE
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'))
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can delete system_settings"
ON public.system_settings
FOR DELETE
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'));

-- lead_assignments (non critico ma allineiamo)
CREATE POLICY "Managers can select lead_assignments"
ON public.lead_assignments
FOR SELECT
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can insert lead_assignments"
ON public.lead_assignments
FOR INSERT
TO authenticated
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can update lead_assignments"
ON public.lead_assignments
FOR UPDATE
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'))
WITH CHECK (public.get_current_user_role() IN ('admin','manager'));

CREATE POLICY "Managers can delete lead_assignments"
ON public.lead_assignments
FOR DELETE
TO authenticated
USING (public.get_current_user_role() IN ('admin','manager'));

-- 3) Installa il trigger per popolare automaticamente public.profiles alla creazione di un utente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created'
  ) THEN
    CREATE TRIGGER on_auth_user_created
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
  END IF;
END $$;
