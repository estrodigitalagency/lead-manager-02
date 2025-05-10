export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      booked_call: {
        Row: {
          created_at: string | null
          id: string
          lead_id: string | null
          note: string | null
          scheduled_at: string
          stato: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          note?: string | null
          scheduled_at: string
          stato?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lead_id?: string | null
          note?: string | null
          scheduled_at?: string
          stato?: string | null
          updated_at?: string | null
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
          booked_call: boolean | null
          created_at: string | null
          email: string | null
          id: string
          nome: string
          note: string | null
          stato: string | null
          telefono: string | null
          updated_at: string | null
        }
        Insert: {
          assignable?: boolean | null
          booked_call?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome: string
          note?: string | null
          stato?: string | null
          telefono?: string | null
          updated_at?: string | null
        }
        Update: {
          assignable?: boolean | null
          booked_call?: boolean | null
          created_at?: string | null
          email?: string | null
          id?: string
          nome?: string
          note?: string | null
          stato?: string | null
          telefono?: string | null
          updated_at?: string | null
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
      venditori: {
        Row: {
          created_at: string | null
          email: string
          id: string
          lead_attuali: number | null
          lead_capacity: number | null
          nome: string
          stato: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          lead_attuali?: number | null
          lead_capacity?: number | null
          nome: string
          stato?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          lead_attuali?: number | null
          lead_capacity?: number | null
          nome?: string
          stato?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_leads_assignability: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
