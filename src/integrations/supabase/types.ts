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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          id: string
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          amount: number
          cancelled_at: string | null
          created_at: string
          id: string
          passenger_id: string
          ride_id: string
          seats: number
          status: string
        }
        Insert: {
          amount: number
          cancelled_at?: string | null
          created_at?: string
          id?: string
          passenger_id: string
          ride_id: string
          seats: number
          status?: string
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          created_at?: string
          id?: string
          passenger_id?: string
          ride_id?: string
          seats?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_passenger_id_fkey"
            columns: ["passenger_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          booking_id: string
          created_at: string
          gross_amount: number
          id: string
          net_amount: number
          payer_id: string
          platform_fee: number
          provider: string
          provider_reference: string | null
          receiver_id: string
          status: string
        }
        Insert: {
          booking_id: string
          created_at?: string
          gross_amount: number
          id?: string
          net_amount: number
          payer_id: string
          platform_fee: number
          provider?: string
          provider_reference?: string | null
          receiver_id: string
          status?: string
        }
        Update: {
          booking_id?: string
          created_at?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          payer_id?: string
          platform_fee?: number
          provider?: string
          provider_reference?: string | null
          receiver_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_payer_id_fkey"
            columns: ["payer_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          account_status: string
          created_at: string
          email: string | null
          gender: string | null
          id: string
          is_demo: boolean
          name: string
          phone: string | null
          profile_photo: string | null
          rating: number
          reliability_score: number
          role: string
          updated_at: string
          verification_status: string
        }
        Insert: {
          account_status?: string
          created_at?: string
          email?: string | null
          gender?: string | null
          id: string
          is_demo?: boolean
          name?: string
          phone?: string | null
          profile_photo?: string | null
          rating?: number
          reliability_score?: number
          role?: string
          updated_at?: string
          verification_status?: string
        }
        Update: {
          account_status?: string
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          is_demo?: boolean
          name?: string
          phone?: string | null
          profile_photo?: string | null
          rating?: number
          reliability_score?: number
          role?: string
          updated_at?: string
          verification_status?: string
        }
        Relationships: []
      }
      ratings: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          review: string | null
          score: number
          to_user_id: string
          trip_id: string
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          review?: string | null
          score: number
          to_user_id: string
          trip_id: string
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          review?: string | null
          score?: number
          to_user_id?: string
          trip_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          category: string
          created_at: string
          description: string
          id: string
          reported_user_id: string | null
          reporter_id: string
          resolved_at: string | null
          status: string
          trip_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          id?: string
          reported_user_id?: string | null
          reporter_id: string
          resolved_at?: string | null
          status?: string
          trip_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          id?: string
          reported_user_id?: string | null
          reporter_id?: string
          resolved_at?: string | null
          status?: string
          trip_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
        ]
      }
      rides: {
        Row: {
          available_seats: number
          created_at: string
          date: string
          departure_time: string
          driver_id: string
          id: string
          price_per_passenger: number
          route_id: string
          status: string
          total_seats: number
          updated_at: string
        }
        Insert: {
          available_seats: number
          created_at?: string
          date: string
          departure_time: string
          driver_id: string
          id?: string
          price_per_passenger: number
          route_id: string
          status?: string
          total_seats: number
          updated_at?: string
        }
        Update: {
          available_seats?: number
          created_at?: string
          date?: string
          departure_time?: string
          driver_id?: string
          id?: string
          price_per_passenger?: number
          route_id?: string
          status?: string
          total_seats?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rides_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string
          departure_time: string
          destination_lat: number
          destination_lng: number
          destination_text: string
          id: string
          origin_lat: number
          origin_lng: number
          origin_text: string
          recurring_days: number[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          departure_time: string
          destination_lat: number
          destination_lng: number
          destination_text: string
          id?: string
          origin_lat: number
          origin_lng: number
          origin_text: string
          recurring_days?: number[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          departure_time?: string
          destination_lat?: number
          destination_lng?: number
          destination_text?: string
          id?: string
          origin_lat?: number
          origin_lng?: number
          origin_text?: string
          recurring_days?: number[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_events: {
        Row: {
          created_at: string
          id: string
          lat: number | null
          lng: number | null
          note: string | null
          status: string
          trip_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string | null
          status?: string
          trip_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          note?: string | null
          status?: string
          trip_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_events_trip_id_fkey"
            columns: ["trip_id"]
            isOneToOne: false
            referencedRelation: "trips"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trips: {
        Row: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          ride_id: string
          started_at: string | null
          status: string
        }
        Insert: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          ride_id: string
          started_at?: string | null
          status?: string
        }
        Update: {
          cancelled_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          ride_id?: string
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "trips_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: true
            referencedRelation: "rides"
            referencedColumns: ["id"]
          },
        ]
      }
      user_blocks: {
        Row: {
          blocked_id: string
          blocker_id: string
          created_at: string
          id: string
        }
        Insert: {
          blocked_id: string
          blocker_id: string
          created_at?: string
          id?: string
        }
        Update: {
          blocked_id?: string
          blocker_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocked_id_fkey"
            columns: ["blocked_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_blocks_blocker_id_fkey"
            columns: ["blocker_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          created_at: string
          id: string
          make: string
          model: string
          registration_number: string
          seat_capacity: number
          updated_at: string
          user_id: string
          verification_status: string
          year: number
        }
        Insert: {
          created_at?: string
          id?: string
          make: string
          model: string
          registration_number: string
          seat_capacity: number
          updated_at?: string
          user_id: string
          verification_status?: string
          year: number
        }
        Update: {
          created_at?: string
          id?: string
          make?: string
          model?: string
          registration_number?: string
          seat_capacity?: number
          updated_at?: string
          user_id?: string
          verification_status?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "public_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      public_profiles: {
        Row: {
          account_status: string | null
          created_at: string | null
          gender: string | null
          id: string | null
          is_demo: boolean | null
          name: string | null
          profile_photo: string | null
          rating: number | null
          reliability_score: number | null
          role: string | null
          verification_status: string | null
        }
        Insert: {
          account_status?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string | null
          is_demo?: boolean | null
          name?: string | null
          profile_photo?: string | null
          rating?: number | null
          reliability_score?: number | null
          role?: string | null
          verification_status?: string | null
        }
        Update: {
          account_status?: string | null
          created_at?: string | null
          gender?: string | null
          id?: string | null
          is_demo?: boolean | null
          name?: string | null
          profile_photo?: string | null
          rating?: number | null
          reliability_score?: number | null
          role?: string | null
          verification_status?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_metrics: { Args: never; Returns: Json }
      admin_resolve_report: {
        Args: { _note: string; _report: string; _status: string }
        Returns: {
          category: string
          created_at: string
          description: string
          id: string
          reported_user_id: string | null
          reporter_id: string
          resolved_at: string | null
          status: string
          trip_id: string | null
        }
        SetofOptions: {
          from: "*"
          to: "reports"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_user_status: {
        Args: { _reason: string; _status: string; _user: string }
        Returns: {
          account_status: string
          created_at: string
          email: string | null
          gender: string | null
          id: string
          is_demo: boolean
          name: string
          phone: string | null
          profile_photo: string | null
          rating: number
          reliability_score: number
          role: string
          updated_at: string
          verification_status: string
        }
        SetofOptions: {
          from: "*"
          to: "profiles"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_set_verification: {
        Args: { _status: string; _target: string; _target_type: string }
        Returns: undefined
      }
      assert_active_account: { Args: never; Returns: undefined }
      cancel_booking: {
        Args: { _booking_id: string }
        Returns: {
          amount: number
          cancelled_at: string | null
          created_at: string
          id: string
          passenger_id: string
          ride_id: string
          seats: number
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      cancel_ride: {
        Args: { _ride_id: string }
        Returns: {
          available_seats: number
          created_at: string
          date: string
          departure_time: string
          driver_id: string
          id: string
          price_per_passenger: number
          route_id: string
          status: string
          total_seats: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      complete_trip: {
        Args: { _ride_id: string }
        Returns: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          ride_id: string
          started_at: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "trips"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_booking: {
        Args: { _ride_id: string; _seats: number }
        Returns: {
          amount: number
          cancelled_at: string | null
          created_at: string
          id: string
          passenger_id: string
          ride_id: string
          seats: number
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_blocked_between: { Args: { a: string; b: string }; Returns: boolean }
      mark_notifications_read: { Args: { _ids: string[] }; Returns: undefined }
      notify: {
        Args: { _message: string; _title: string; _type: string; _user: string }
        Returns: undefined
      }
      publish_ride: {
        Args: { _ride_id: string }
        Returns: {
          available_seats: number
          created_at: string
          date: string
          departure_time: string
          driver_id: string
          id: string
          price_per_passenger: number
          route_id: string
          status: string
          total_seats: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "rides"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      recompute_user_scores: { Args: { _user: string }; Returns: undefined }
      respond_booking: {
        Args: { _accept: boolean; _booking_id: string }
        Returns: {
          amount: number
          cancelled_at: string | null
          created_at: string
          id: string
          passenger_id: string
          ride_id: string
          seats: number
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "bookings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      start_trip: {
        Args: { _ride_id: string }
        Returns: {
          cancelled_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          ride_id: string
          started_at: string | null
          status: string
        }
        SetofOptions: {
          from: "*"
          to: "trips"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_rating: {
        Args: {
          _review: string
          _score: number
          _to_user: string
          _trip_id: string
        }
        Returns: {
          created_at: string
          from_user_id: string
          id: string
          review: string | null
          score: number
          to_user_id: string
          trip_id: string
        }
        SetofOptions: {
          from: "*"
          to: "ratings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
