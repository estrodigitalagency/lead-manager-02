export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      assignment_history: {
        Row: {
          assigned_at: string
          assignment_type: string
          bypass_time_interval: boolean | null
          campagna: string | null
          created_at: string
          exclude_from_included: string[] | null
          fonti_escluse: string[] | null
          fonti_incluse: string[] | null
          id: string
          lead_ids: string[] | null
          leads_count: number
          market: string
          source_mode: string | null
          venditore: string
        }
        Insert: {
          assigned_at?: string
          assignment_type?: string
          bypass_time_interval?: boolean | null
          campagna?: string | null
          created_at?: string
          exclude_from_included?: string[] | null
          fonti_escluse?: string[] | null
          fonti_incluse?: string[] | null
          id?: string
          lead_ids?: string[] | null
          leads_count: number
          market?: string
          source_mode?: string | null
          venditore: string
        }
        Update: {
          assigned_at?: string
          assignment_type?: string
          bypass_time_interval?: boolean | null
          campagna?: string | null
          created_at?: string
          exclude_from_included?: string[] | null
          fonti_escluse?: string[] | null
          fonti_incluse?: string[] | null
          id?: string
          lead_ids?: string[] | null
          leads_count?: number
          market?: string
          source_mode?: string | null
          venditore?: string
        }
        Relationships: []
      }
      automation_executions: {
        Row: {
          action_taken: string
          automation_id: string
          automation_name: string
          created_at: string
          error_message: string | null
          executed_at: string
          execution_source: string
          id: string
          lead_email: string | null
          lead_id: string
          lead_name: string | null
          market: string
          result: string
          seller_assigned: string | null
          seller_id: string | null
          trigger_field: string
          trigger_value: string
          webhook_sent: boolean | null
          webhook_success: boolean | null
        }
        Insert: {
          action_taken: string
          automation_id: string
          automation_name: string
          created_at?: string
          error_message?: string | null
          executed_at?: string
          execution_source: string
          id?: string
          lead_email?: string | null
          lead_id: string
          lead_name?: string | null
          market?: string
          result: string
          seller_assigned?: string | null
          seller_id?: string | null
          trigger_field: string
          trigger_value: string
          webhook_sent?: boolean | null
          webhook_success?: boolean | null
        }
        Update: {
          action_taken?: string
          automation_id?: string
          automation_name?: string
          created_at?: string
          error_message?: string | null
          executed_at?: string
          execution_source?: string
          id?: string
          lead_email?: string | null
          lead_id?: string
          lead_name?: string | null
          market?: string
          result?: string
          seller_assigned?: string | null
          seller_id?: string | null
          trigger_field?: string
          trigger_value?: string
          webhook_sent?: boolean | null
          webhook_success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_automation_id_fkey"
            columns: ["automation_id"]
            isOneToOne: false
            referencedRelation: "lead_assignment_automations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "automation_executions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_generation"
            referencedColumns: ["id"]
          },
        ]
      }
      booked_call: {
        Row: {
          cognome: string | null
          created_at: string | null
          data_call: string | null
          email: string | null
          fonte: string | null
          id: string
          lead_id: string | null
          market: string
          nome: string | null
          scheduled_at: string
          stato: string | null
          telefono: string | null
          updated_at: string | null
          venditore: string | null
        }
        Insert: {
          cognome?: string | null
          created_at?: string | null
          data_call?: string | null
          email?: string | null
          fonte?: string | null
          id?: string
          lead_id?: string | null
          market?: string
          nome?: string | null
          scheduled_at: string
          stato?: string | null
          telefono?: string | null
          updated_at?: string | null
          venditore?: string | null
        }
        Update: {
          cognome?: string | null
          created_at?: string | null
          data_call?: string | null
          email?: string | null
          fonte?: string | null
          id?: string
          lead_id?: string | null
          market?: string
          nome?: string | null
          scheduled_at?: string
          stato?: string | null
          telefono?: string | null
          updated_at?: string | null
          venditore?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "booked_call_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_generation"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_clicks: {
        Row: {
          call_prenotata: string | null
          created_at: string
          data_ingresso: string | null
          email: string
          fonte: string | null
          id: string
          market: string
          nome: string
          telefono: string
          venditore: string | null
          webhook_sent: string | null
        }
        Insert: {
          call_prenotata?: string | null
          created_at?: string
          data_ingresso?: string | null
          email: string
          fonte?: string | null
          id?: string
          market?: string
          nome: string
          telefono: string
          venditore?: string | null
          webhook_sent?: string | null
        }
        Update: {
          call_prenotata?: string | null
          created_at?: string
          data_ingresso?: string | null
          email?: string
          fonte?: string | null
          id?: string
          market?: string
          nome?: string
          telefono?: string
          venditore?: string | null
          webhook_sent?: string | null
        }
        Relationships: []
      }
      booking_clicks_evergreen: {
        Row: {
          call_prenotata: string | null
          created_at: string
          data_ingresso: string | null
          email: string
          fonte: string | null
          id: string
          market: string
          nome: string
          telefono: string
          venditore: string | null
        }
        Insert: {
          call_prenotata?: string | null
          created_at?: string
          data_ingresso?: string | null
          email: string
          fonte?: string | null
          id?: string
          market?: string
          nome: string
          telefono: string
          venditore?: string | null
        }
        Update: {
          call_prenotata?: string | null
          created_at?: string
          data_ingresso?: string | null
          email?: string
          fonte?: string | null
          id?: string
          market?: string
          nome?: string
          telefono?: string
          venditore?: string | null
        }
        Relationships: []
      }
      booking_clicks_lancio: {
        Row: {
          call_prenotata: string | null
          created_at: string
          data_ingresso: string | null
          email: string
          fonte: string | null
          id: string
          market: string
          nome: string
          telefono: string
          venditore: string | null
        }
        Insert: {
          call_prenotata?: string | null
          created_at?: string
          data_ingresso?: string | null
          email: string
          fonte?: string | null
          id?: string
          market?: string
          nome: string
          telefono: string
          venditore?: string | null
        }
        Update: {
          call_prenotata?: string | null
          created_at?: string
          data_ingresso?: string | null
          email?: string
          fonte?: string | null
          id?: string
          market?: string
          nome?: string
          telefono?: string
          venditore?: string | null
        }
        Relationships: []
      }
      calendly_event_types: {
        Row: {
          duration: number
          id: string
          members: Json | null
          name: string
          owner_name: string
          pooling_type: string | null
          scheduling_url: string | null
          slug: string | null
          updated_at: string | null
          uri: string
        }
        Insert: {
          duration: number
          id?: string
          members?: Json | null
          name: string
          owner_name: string
          pooling_type?: string | null
          scheduling_url?: string | null
          slug?: string | null
          updated_at?: string | null
          uri: string
        }
        Update: {
          duration?: number
          id?: string
          members?: Json | null
          name?: string
          owner_name?: string
          pooling_type?: string | null
          scheduling_url?: string | null
          slug?: string | null
          updated_at?: string | null
          uri?: string
        }
        Relationships: []
      }
      conferma_partecipazione_webinar: {
        Row: {
          cognome: string | null
          created_at: string
          email: string | null
          fonte: string | null
          id: string
          market: string
          nome: string | null
          telefono: string | null
        }
        Insert: {
          cognome?: string | null
          created_at?: string
          email?: string | null
          fonte?: string | null
          id?: string
          market?: string
          nome?: string | null
          telefono?: string | null
        }
        Update: {
          cognome?: string | null
          created_at?: string
          email?: string | null
          fonte?: string | null
          id?: string
          market?: string
          nome?: string | null
          telefono?: string | null
        }
        Relationships: []
      }
      database_campagne: {
        Row: {
          attivo: boolean
          bypass_time_interval: boolean | null
          created_at: string
          descrizione: string | null
          exclude_from_included: string[] | null
          fonti_escluse: string[] | null
          fonti_incluse: string[] | null
          id: string
          market: string
          nome: string
          source_mode: string | null
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          bypass_time_interval?: boolean | null
          created_at?: string
          descrizione?: string | null
          exclude_from_included?: string[] | null
          fonti_escluse?: string[] | null
          fonti_incluse?: string[] | null
          id?: string
          market?: string
          nome: string
          source_mode?: string | null
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          bypass_time_interval?: boolean | null
          created_at?: string
          descrizione?: string | null
          exclude_from_included?: string[] | null
          fonti_escluse?: string[] | null
          fonti_incluse?: string[] | null
          id?: string
          market?: string
          nome?: string
          source_mode?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      database_fonti: {
        Row: {
          attivo: boolean
          created_at: string
          descrizione: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          created_at?: string
          descrizione?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          created_at?: string
          descrizione?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      fonte_calendar_conditions: {
        Row: {
          attivo: boolean
          calendly_url: string
          created_at: string
          fonte_name: string
          id: string
          match_type: string
          priorita: number
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          calendly_url: string
          created_at?: string
          fonte_name: string
          id?: string
          match_type?: string
          priorita?: number
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          calendly_url?: string
          created_at?: string
          fonte_name?: string
          id?: string
          match_type?: string
          priorita?: number
          updated_at?: string
        }
        Relationships: []
      }
      fonte_mapping: {
        Row: {
          created_at: string
          fonte_calendario: string
          fonte_lead: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fonte_calendario: string
          fonte_lead: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fonte_calendario?: string
          fonte_lead?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      form_events: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string | null
          event_type: string
          form_id: string
          id: string
          nome: string | null
          telefono: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          event_type: string
          form_id: string
          id?: string
          nome?: string | null
          telefono?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string | null
          event_type?: string
          form_id?: string
          id?: string
          nome?: string | null
          telefono?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_events_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          attivo: boolean
          calendly_event_type_uri: string | null
          calendly_url: string
          colore_primario: string | null
          created_at: string
          disclaimer: string | null
          fonte: string | null
          id: string
          meta_access_token: string | null
          meta_pixel_id: string | null
          meta_test_event_code: string | null
          nome: string
          redirect_url: string | null
          sottotitolo: string | null
          titolo: string | null
          updated_at: string
          urgency_message: string | null
          view_filter_param: string | null
          webhook_url: string
        }
        Insert: {
          attivo?: boolean
          calendly_event_type_uri?: string | null
          calendly_url: string
          colore_primario?: string | null
          created_at?: string
          disclaimer?: string | null
          fonte?: string | null
          id?: string
          meta_access_token?: string | null
          meta_pixel_id?: string | null
          meta_test_event_code?: string | null
          nome: string
          redirect_url?: string | null
          sottotitolo?: string | null
          titolo?: string | null
          updated_at?: string
          urgency_message?: string | null
          view_filter_param?: string | null
          webhook_url: string
        }
        Update: {
          attivo?: boolean
          calendly_event_type_uri?: string | null
          calendly_url?: string
          colore_primario?: string | null
          created_at?: string
          disclaimer?: string | null
          fonte?: string | null
          id?: string
          meta_access_token?: string | null
          meta_pixel_id?: string | null
          meta_test_event_code?: string | null
          nome?: string
          redirect_url?: string | null
          sottotitolo?: string | null
          titolo?: string | null
          updated_at?: string
          urgency_message?: string | null
          view_filter_param?: string | null
          webhook_url?: string
        }
        Relationships: []
      }
      lead_actions_log: {
        Row: {
          action_type: string
          created_at: string
          id: string
          lead_ids: string[]
          leads_count: number
          market: string
          new_venditore: string | null
          notes: string | null
          performed_by: string | null
          previous_venditore: string | null
          source_assignment_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          lead_ids: string[]
          leads_count: number
          market?: string
          new_venditore?: string | null
          notes?: string | null
          performed_by?: string | null
          previous_venditore?: string | null
          source_assignment_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          lead_ids?: string[]
          leads_count?: number
          market?: string
          new_venditore?: string | null
          notes?: string | null
          performed_by?: string | null
          previous_venditore?: string | null
          source_assignment_id?: string | null
        }
        Relationships: []
      }
      lead_assignment_automations: {
        Row: {
          action_type: Database["public"]["Enums"]["automation_action_type"]
          attivo: boolean
          campagna: string | null
          condition_type: Database["public"]["Enums"]["automation_condition_type"]
          condition_value: string[]
          created_at: string
          excluded_sellers: string[] | null
          id: string
          lock_period_days: number | null
          market: string
          nome: string
          priority: number
          sheets_tab_name: string | null
          target_seller_id: string | null
          trigger_field: string
          trigger_sources: string[] | null
          trigger_when: string
          updated_at: string
          webhook_enabled: boolean
        }
        Insert: {
          action_type: Database["public"]["Enums"]["automation_action_type"]
          attivo?: boolean
          campagna?: string | null
          condition_type: Database["public"]["Enums"]["automation_condition_type"]
          condition_value: string[]
          created_at?: string
          excluded_sellers?: string[] | null
          id?: string
          lock_period_days?: number | null
          market?: string
          nome: string
          priority?: number
          sheets_tab_name?: string | null
          target_seller_id?: string | null
          trigger_field?: string
          trigger_sources?: string[] | null
          trigger_when?: string
          updated_at?: string
          webhook_enabled?: boolean
        }
        Update: {
          action_type?: Database["public"]["Enums"]["automation_action_type"]
          attivo?: boolean
          campagna?: string | null
          condition_type?: Database["public"]["Enums"]["automation_condition_type"]
          condition_value?: string[]
          created_at?: string
          excluded_sellers?: string[] | null
          id?: string
          lock_period_days?: number | null
          market?: string
          nome?: string
          priority?: number
          sheets_tab_name?: string | null
          target_seller_id?: string | null
          trigger_field?: string
          trigger_sources?: string[] | null
          trigger_when?: string
          updated_at?: string
          webhook_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignment_automations_target_seller_id_fkey"
            columns: ["target_seller_id"]
            isOneToOne: false
            referencedRelation: "venditori"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_assignments: {
        Row: {
          assigned_at: string | null
          id: string
          lead_id: string | null
          stato: string | null
          venditore_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          lead_id?: string | null
          stato?: string | null
          venditore_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          id?: string
          lead_id?: string | null
          stato?: string | null
          venditore_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_assignments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "lead_generation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_assignments_venditore_id_fkey"
            columns: ["venditore_id"]
            isOneToOne: false
            referencedRelation: "venditori"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_generation: {
        Row: {
          assignable: boolean | null
          booked_call: string | null
          campagna: string | null
          cognome: string | null
          created_at: string | null
          data_assegnazione: string | null
          data_chiusura: string | null
          email: string | null
          fonte: string | null
          fonte_vendita: string | null
          id: string
          importo_vendita: number | null
          lead_score: string | null
          manually_not_assignable: boolean | null
          market: string
          nome: string
          note_vendita: string | null
          percorso_venduto: string | null
          stato: string | null
          stato_del_lead: string | null
          telefono: string | null
          ultima_fonte: string | null
          updated_at: string | null
          vendita_chiusa: boolean | null
          venditore: string | null
        }
        Insert: {
          assignable?: boolean | null
          booked_call?: string | null
          campagna?: string | null
          cognome?: string | null
          created_at?: string | null
          data_assegnazione?: string | null
          data_chiusura?: string | null
          email?: string | null
          fonte?: string | null
          fonte_vendita?: string | null
          id?: string
          importo_vendita?: number | null
          lead_score?: string | null
          manually_not_assignable?: boolean | null
          market?: string
          nome: string
          note_vendita?: string | null
          percorso_venduto?: string | null
          stato?: string | null
          stato_del_lead?: string | null
          telefono?: string | null
          ultima_fonte?: string | null
          updated_at?: string | null
          vendita_chiusa?: boolean | null
          venditore?: string | null
        }
        Update: {
          assignable?: boolean | null
          booked_call?: string | null
          campagna?: string | null
          cognome?: string | null
          created_at?: string | null
          data_assegnazione?: string | null
          data_chiusura?: string | null
          email?: string | null
          fonte?: string | null
          fonte_vendita?: string | null
          id?: string
          importo_vendita?: number | null
          lead_score?: string | null
          manually_not_assignable?: boolean | null
          market?: string
          nome?: string
          note_vendita?: string | null
          percorso_venduto?: string | null
          stato?: string | null
          stato_del_lead?: string | null
          telefono?: string | null
          ultima_fonte?: string | null
          updated_at?: string | null
          vendita_chiusa?: boolean | null
          venditore?: string | null
        }
        Relationships: []
      }
      lead_lavorati: {
        Row: {
          cognome: string | null
          created_at: string | null
          data_call: string | null
          data_contatto: string | null
          email: string | null
          esito: string | null
          id: string
          market: string
          nome: string
          obiezioni: string | null
          telefono: string | null
          updated_at: string | null
          venditore: string | null
        }
        Insert: {
          cognome?: string | null
          created_at?: string | null
          data_call?: string | null
          data_contatto?: string | null
          email?: string | null
          esito?: string | null
          id?: string
          market?: string
          nome: string
          obiezioni?: string | null
          telefono?: string | null
          updated_at?: string | null
          venditore?: string | null
        }
        Update: {
          cognome?: string | null
          created_at?: string | null
          data_call?: string | null
          data_contatto?: string | null
          email?: string | null
          esito?: string | null
          id?: string
          market?: string
          nome?: string
          obiezioni?: string | null
          telefono?: string | null
          updated_at?: string | null
          venditore?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name: string
          id: string
          last_name: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          descrizione: string | null
          id: string
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          descrizione?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          descrizione?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      uptime_monitoring: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          response_time_ms: number | null
          status: string
          status_code: number | null
          timestamp: string
          url: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          status: string
          status_code?: number | null
          timestamp?: string
          url: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          response_time_ms?: number | null
          status?: string
          status_code?: number | null
          timestamp?: string
          url?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      venditori: {
        Row: {
          cognome: string
          created_at: string | null
          delivery_method: string
          email: string | null
          id: string
          lead_attuali: number | null
          lead_capacity: number | null
          market: string
          nome: string
          sheets_file_id: string
          sheets_tab_name: string
          stato: string | null
          telefono: string | null
          updated_at: string | null
          webhook_url: string | null
        }
        Insert: {
          cognome?: string
          created_at?: string | null
          delivery_method?: string
          email?: string | null
          id?: string
          lead_attuali?: number | null
          lead_capacity?: number | null
          market?: string
          nome: string
          sheets_file_id?: string
          sheets_tab_name?: string
          stato?: string | null
          telefono?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Update: {
          cognome?: string
          created_at?: string | null
          delivery_method?: string
          email?: string | null
          id?: string
          lead_attuali?: number | null
          lead_capacity?: number | null
          market?: string
          nome?: string
          sheets_file_id?: string
          sheets_tab_name?: string
          stato?: string | null
          telefono?: string | null
          updated_at?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      venditori_calendly: {
        Row: {
          attivo: boolean
          calendly_url: string
          created_at: string
          id: string
          market: string
          nome_venditore: string
          updated_at: string
        }
        Insert: {
          attivo?: boolean
          calendly_url: string
          created_at?: string
          id?: string
          market?: string
          nome_venditore: string
          updated_at?: string
        }
        Update: {
          attivo?: boolean
          calendly_url?: string
          created_at?: string
          id?: string
          market?: string
          nome_venditore?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_leads_assignability: { Args: never; Returns: undefined }
      get_current_user_role: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      schedule_sync_job: {
        Args: { anon_key: string; cron_expr: string; function_url: string }
        Returns: undefined
      }
      unschedule_sync_job: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "user"
      automation_action_type: "assign_to_seller" | "assign_to_previous_seller"
      automation_condition_type:
        | "contains"
        | "equals"
        | "starts_with"
        | "ends_with"
        | "not_contains"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      automation_action_type: ["assign_to_seller", "assign_to_previous_seller"],
      automation_condition_type: [
        "contains",
        "equals",
        "starts_with",
        "ends_with",
        "not_contains",
      ],
    },
  },
} as const
