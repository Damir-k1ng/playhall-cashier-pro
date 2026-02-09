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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action_type: Database["public"]["Enums"]["audit_action_type"]
          admin_id: string
          cashier_name: string | null
          created_at: string
          id: string
          new_values: Json | null
          old_values: Json | null
          reason: string
          shift_id: string | null
          station_name: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["audit_action_type"]
          admin_id: string
          cashier_name?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason: string
          shift_id?: string | null
          station_name?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["audit_action_type"]
          admin_id?: string
          cashier_name?: string | null
          created_at?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
          reason?: string
          shift_id?: string | null
          station_name?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "cashiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          booking_date: string
          comment: string | null
          created_at: string
          id: string
          start_time: string
          station_id: string
          status: Database["public"]["Enums"]["booking_status"]
        }
        Insert: {
          booking_date?: string
          comment?: string | null
          created_at?: string
          id?: string
          start_time: string
          station_id: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Update: {
          booking_date?: string
          comment?: string | null
          created_at?: string
          id?: string
          start_time?: string
          station_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
        }
        Relationships: [
          {
            foreignKeyName: "bookings_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      cashiers: {
        Row: {
          created_at: string
          id: string
          name: string
          pin: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          pin: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          pin?: string
        }
        Relationships: []
      }
      controller_usage: {
        Row: {
          cost: number | null
          id: string
          returned_at: string | null
          session_id: string
          taken_at: string
        }
        Insert: {
          cost?: number | null
          id?: string
          returned_at?: string | null
          session_id: string
          taken_at?: string
        }
        Update: {
          cost?: number | null
          id?: string
          returned_at?: string | null
          session_id?: string
          taken_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "controller_usage_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      drink_sales: {
        Row: {
          cash_amount: number | null
          created_at: string
          drink_id: string
          id: string
          kaspi_amount: number | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          quantity: number
          shift_id: string
          total_price: number
        }
        Insert: {
          cash_amount?: number | null
          created_at?: string
          drink_id: string
          id?: string
          kaspi_amount?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          quantity?: number
          shift_id: string
          total_price: number
        }
        Update: {
          cash_amount?: number | null
          created_at?: string
          drink_id?: string
          id?: string
          kaspi_amount?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          quantity?: number
          shift_id?: string
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "drink_sales_drink_id_fkey"
            columns: ["drink_id"]
            isOneToOne: false
            referencedRelation: "drinks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drink_sales_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      drinks: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      payments: {
        Row: {
          cash_amount: number | null
          created_at: string
          id: string
          kaspi_amount: number | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          session_id: string
          shift_id: string
          total_amount: number
        }
        Insert: {
          cash_amount?: number | null
          created_at?: string
          id?: string
          kaspi_amount?: number | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          session_id: string
          shift_id: string
          total_amount: number
        }
        Update: {
          cash_amount?: number | null
          created_at?: string
          id?: string
          kaspi_amount?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          session_id?: string
          shift_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          customer_name: string | null
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          reserved_for: string
          shift_id: string
          station_id: string
        }
        Insert: {
          created_at?: string
          customer_name?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          reserved_for: string
          shift_id: string
          station_id: string
        }
        Update: {
          created_at?: string
          customer_name?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          reserved_for?: string
          shift_id?: string
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      session_drinks: {
        Row: {
          created_at: string
          drink_id: string
          id: string
          quantity: number
          session_id: string
          total_price: number
        }
        Insert: {
          created_at?: string
          drink_id: string
          id?: string
          quantity?: number
          session_id: string
          total_price: number
        }
        Update: {
          created_at?: string
          drink_id?: string
          id?: string
          quantity?: number
          session_id?: string
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_drinks_drink_id_fkey"
            columns: ["drink_id"]
            isOneToOne: false
            referencedRelation: "drinks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_drinks_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          controller_cost: number | null
          created_at: string
          drink_cost: number | null
          ended_at: string | null
          game_cost: number | null
          id: string
          package_count: number
          shift_id: string
          started_at: string
          station_id: string
          status: Database["public"]["Enums"]["session_status"]
          tariff_type: Database["public"]["Enums"]["tariff_type"]
          total_cost: number | null
        }
        Insert: {
          controller_cost?: number | null
          created_at?: string
          drink_cost?: number | null
          ended_at?: string | null
          game_cost?: number | null
          id?: string
          package_count?: number
          shift_id: string
          started_at?: string
          station_id: string
          status?: Database["public"]["Enums"]["session_status"]
          tariff_type: Database["public"]["Enums"]["tariff_type"]
          total_cost?: number | null
        }
        Update: {
          controller_cost?: number | null
          created_at?: string
          drink_cost?: number | null
          ended_at?: string | null
          game_cost?: number | null
          id?: string
          package_count?: number
          shift_id?: string
          started_at?: string
          station_id?: string
          status?: Database["public"]["Enums"]["session_status"]
          tariff_type?: Database["public"]["Enums"]["tariff_type"]
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "sessions_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          cashier_id: string
          ended_at: string | null
          id: string
          is_active: boolean
          session_token: string | null
          started_at: string
          total_cash: number
          total_controllers: number
          total_drinks: number
          total_games: number
          total_kaspi: number
        }
        Insert: {
          cashier_id: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          session_token?: string | null
          started_at?: string
          total_cash?: number
          total_controllers?: number
          total_drinks?: number
          total_games?: number
          total_kaspi?: number
        }
        Update: {
          cashier_id?: string
          ended_at?: string | null
          id?: string
          is_active?: boolean
          session_token?: string | null
          started_at?: string
          total_cash?: number
          total_controllers?: number
          total_drinks?: number
          total_games?: number
          total_kaspi?: number
        }
        Relationships: [
          {
            foreignKeyName: "shifts_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "cashiers"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          created_at: string
          hourly_rate: number
          id: string
          name: string
          package_rate: number
          station_number: number
          zone: string
        }
        Insert: {
          created_at?: string
          hourly_rate: number
          id?: string
          name: string
          package_rate: number
          station_number: number
          zone: string
        }
        Update: {
          created_at?: string
          hourly_rate?: number
          id?: string
          name?: string
          package_rate?: number
          station_number?: number
          zone?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          cashier_id: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string | null
        }
        Insert: {
          cashier_id?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id?: string | null
        }
        Update: {
          cashier_id?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "cashiers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "cashier"
      audit_action_type:
        | "edit_session"
        | "delete_session"
        | "delete_drink_sale"
        | "edit_controller"
      booking_status: "booked" | "cancelled" | "completed"
      payment_method: "cash" | "kaspi" | "split"
      session_status: "active" | "completed"
      tariff_type: "hourly" | "package"
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
      app_role: ["admin", "cashier"],
      audit_action_type: [
        "edit_session",
        "delete_session",
        "delete_drink_sale",
        "edit_controller",
      ],
      booking_status: ["booked", "cancelled", "completed"],
      payment_method: ["cash", "kaspi", "split"],
      session_status: ["active", "completed"],
      tariff_type: ["hourly", "package"],
    },
  },
} as const
