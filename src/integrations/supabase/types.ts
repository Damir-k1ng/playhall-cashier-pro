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
          tenant_id: string
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
          tenant_id: string
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
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_admin_audit_log_shift_tenant"
            columns: ["shift_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id", "tenant_id"]
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
          tenant_id: string
        }
        Insert: {
          booking_date?: string
          comment?: string | null
          created_at?: string
          id?: string
          start_time: string
          station_id: string
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id: string
        }
        Update: {
          booking_date?: string
          comment?: string | null
          created_at?: string
          id?: string
          start_time?: string
          station_id?: string
          status?: Database["public"]["Enums"]["booking_status"]
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bookings_station_tenant"
            columns: ["station_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      controller_usage: {
        Row: {
          cost: number | null
          id: string
          returned_at: string | null
          session_id: string
          taken_at: string
          tenant_id: string
        }
        Insert: {
          cost?: number | null
          id?: string
          returned_at?: string | null
          session_id: string
          taken_at?: string
          tenant_id: string
        }
        Update: {
          cost?: number | null
          id?: string
          returned_at?: string | null
          session_id?: string
          taken_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "controller_usage_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_controller_usage_session_tenant"
            columns: ["session_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      discount_presets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          percent: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          percent: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          percent?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discount_presets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
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
          tenant_id: string
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
          tenant_id?: string
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "drink_sales_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_drink_sales_drink_tenant"
            columns: ["drink_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "drinks"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "fk_drink_sales_shift_tenant"
            columns: ["shift_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      drinks: {
        Row: {
          created_at: string
          id: string
          name: string
          price: number
          tenant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price: number
          tenant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price?: number
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drinks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory: {
        Row: {
          drink_id: string
          id: string
          min_threshold: number
          quantity: number
          tenant_id: string
          unit: Database["public"]["Enums"]["inventory_unit"]
          updated_at: string
        }
        Insert: {
          drink_id: string
          id?: string
          min_threshold?: number
          quantity?: number
          tenant_id: string
          unit?: Database["public"]["Enums"]["inventory_unit"]
          updated_at?: string
        }
        Update: {
          drink_id?: string
          id?: string
          min_threshold?: number
          quantity?: number
          tenant_id?: string
          unit?: Database["public"]["Enums"]["inventory_unit"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_drink_tenant"
            columns: ["drink_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "drinks"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          drink_id: string
          id: string
          performed_by: string | null
          quantity_change: number
          reason: string | null
          reference_id: string | null
          shift_id: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["inventory_movement_type"]
        }
        Insert: {
          created_at?: string
          drink_id: string
          id?: string
          performed_by?: string | null
          quantity_change: number
          reason?: string | null
          reference_id?: string | null
          shift_id?: string | null
          tenant_id: string
          type: Database["public"]["Enums"]["inventory_movement_type"]
        }
        Update: {
          created_at?: string
          drink_id?: string
          id?: string
          performed_by?: string | null
          quantity_change?: number
          reason?: string | null
          reference_id?: string | null
          shift_id?: string | null
          tenant_id?: string
          type?: Database["public"]["Enums"]["inventory_movement_type"]
        }
        Relationships: [
          {
            foreignKeyName: "fk_inventory_movements_drink_tenant"
            columns: ["drink_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "drinks"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "fk_inventory_movements_shift_tenant"
            columns: ["shift_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "inventory_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      package_presets: {
        Row: {
          created_at: string
          duration_hours: number
          id: string
          is_active: boolean
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          duration_hours?: number
          id?: string
          is_active?: boolean
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          duration_hours?: number
          id?: string
          is_active?: boolean
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "package_presets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          cash_amount: number | null
          created_at: string
          discount_amount: number
          discount_percent: number
          id: string
          kaspi_amount: number | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          session_id: string
          shift_id: string
          tenant_id: string
          total_amount: number
        }
        Insert: {
          cash_amount?: number | null
          created_at?: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          kaspi_amount?: number | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          session_id: string
          shift_id: string
          tenant_id: string
          total_amount: number
        }
        Update: {
          cash_amount?: number | null
          created_at?: string
          discount_amount?: number
          discount_percent?: number
          id?: string
          kaspi_amount?: number | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          session_id?: string
          shift_id?: string
          tenant_id?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_payments_session_tenant"
            columns: ["session_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "fk_payments_shift_tenant"
            columns: ["shift_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
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
          tenant_id: string
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
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reservations_shift_tenant"
            columns: ["shift_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "fk_reservations_station_tenant"
            columns: ["station_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "reservations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
          total_price: number
        }
        Insert: {
          created_at?: string
          drink_id: string
          id?: string
          quantity?: number
          session_id: string
          tenant_id: string
          total_price: number
        }
        Update: {
          created_at?: string
          drink_id?: string
          id?: string
          quantity?: number
          session_id?: string
          tenant_id?: string
          total_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_session_drinks_drink_tenant"
            columns: ["drink_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "drinks"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "fk_session_drinks_session_tenant"
            columns: ["session_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "session_drinks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
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
          tenant_id: string
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
          tenant_id?: string
          total_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_sessions_shift_tenant"
            columns: ["shift_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "fk_sessions_station_tenant"
            columns: ["station_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          is_admin_session: boolean
          session_token: string | null
          started_at: string
          tenant_id: string
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
          is_admin_session?: boolean
          session_token?: string | null
          started_at?: string
          tenant_id: string
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
          is_admin_session?: boolean
          session_token?: string | null
          started_at?: string
          tenant_id?: string
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
          tenant_id: string
          zone: string
        }
        Insert: {
          created_at?: string
          hourly_rate: number
          id?: string
          name: string
          package_rate: number
          station_number: number
          tenant_id: string
          zone: string
        }
        Update: {
          created_at?: string
          hourly_rate?: number
          id?: string
          name?: string
          package_rate?: number
          station_number?: number
          tenant_id?: string
          zone?: string
        }
        Relationships: [
          {
            foreignKeyName: "stations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          city: string | null
          club_name: string
          created_at: string
          id: string
          plan: string
          signup_email: string | null
          signup_phone: string | null
          status: Database["public"]["Enums"]["tenant_status"]
          trial_until: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          club_name: string
          created_at?: string
          id?: string
          plan?: string
          signup_email?: string | null
          signup_phone?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          trial_until?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          city?: string | null
          club_name?: string
          created_at?: string
          id?: string
          plan?: string
          signup_email?: string | null
          signup_phone?: string | null
          status?: Database["public"]["Enums"]["tenant_status"]
          trial_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tenants_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          created_at: string
          email: string | null
          id: string
          max_discount_percent: number
          name: string
          password_hash: string | null
          pin_code: string | null
          role: Database["public"]["Enums"]["user_role"]
          tenant_id: string | null
        }
        Insert: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          max_discount_percent?: number
          name: string
          password_hash?: string | null
          pin_code?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
        }
        Update: {
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          id?: string
          max_discount_percent?: number
          name?: string
          password_hash?: string | null
          pin_code?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
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
      increment_shift_totals: {
        Args: {
          p_cash?: number
          p_controllers?: number
          p_drinks?: number
          p_games?: number
          p_kaspi?: number
          p_shift_id: string
        }
        Returns: undefined
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
      inventory_movement_type: "intake" | "sale" | "write_off" | "correction"
      inventory_unit: "piece" | "liter"
      payment_method: "cash" | "kaspi" | "split"
      session_status: "active" | "completed"
      tariff_type: "hourly" | "package"
      tenant_status: "pending" | "trial" | "active" | "suspended" | "blocked"
      user_role: "platform_owner" | "club_admin" | "cashier"
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
      inventory_movement_type: ["intake", "sale", "write_off", "correction"],
      inventory_unit: ["piece", "liter"],
      payment_method: ["cash", "kaspi", "split"],
      session_status: ["active", "completed"],
      tariff_type: ["hourly", "package"],
      tenant_status: ["pending", "trial", "active", "suspended", "blocked"],
      user_role: ["platform_owner", "club_admin", "cashier"],
    },
  },
} as const
