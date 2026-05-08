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
      diagnoses: {
        Row: {
          client_name: string
          created_at: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["diagnosis_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          client_name: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["diagnosis_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          client_name?: string
          created_at?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["diagnosis_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      diagnosis_results: {
        Row: {
          cohorts: Json | null
          diagnosis_id: string
          generated_at: string
          health_score: number | null
          kpis: Json | null
          risks: Json | null
          verdict: string | null
        }
        Insert: {
          cohorts?: Json | null
          diagnosis_id: string
          generated_at?: string
          health_score?: number | null
          kpis?: Json | null
          risks?: Json | null
          verdict?: string | null
        }
        Update: {
          cohorts?: Json | null
          diagnosis_id?: string
          generated_at?: string
          health_score?: number | null
          kpis?: Json | null
          risks?: Json | null
          verdict?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_results_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: true
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          annual_ctc: number | null
          created_at: string
          date_of_joining: string | null
          department: string | null
          diagnosis_id: string
          employee_code: string | null
          employment_status: string | null
          full_name: string | null
          gender: string | null
          id: string
          job_level: string | null
          last_perf_rating: number | null
          location: string | null
          manager: string | null
          tenure_years: number | null
        }
        Insert: {
          annual_ctc?: number | null
          created_at?: string
          date_of_joining?: string | null
          department?: string | null
          diagnosis_id: string
          employee_code?: string | null
          employment_status?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          job_level?: string | null
          last_perf_rating?: number | null
          location?: string | null
          manager?: string | null
          tenure_years?: number | null
        }
        Update: {
          annual_ctc?: number | null
          created_at?: string
          date_of_joining?: string | null
          department?: string | null
          diagnosis_id?: string
          employee_code?: string | null
          employment_status?: string | null
          full_name?: string | null
          gender?: string | null
          id?: string
          job_level?: string | null
          last_perf_rating?: number | null
          location?: string | null
          manager?: string | null
          tenure_years?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
        ]
      }
      engagement_responses: {
        Row: {
          belonging: number | null
          career_growth: number | null
          created_at: string
          department: string | null
          diagnosis_id: string
          employee_code: string | null
          engagement_score: number | null
          enps: number | null
          id: string
          manager: string | null
          manager_effectiveness: number | null
          recognition: number | null
          submitted_on: string | null
          work_life_balance: number | null
          would_recommend: string | null
        }
        Insert: {
          belonging?: number | null
          career_growth?: number | null
          created_at?: string
          department?: string | null
          diagnosis_id: string
          employee_code?: string | null
          engagement_score?: number | null
          enps?: number | null
          id?: string
          manager?: string | null
          manager_effectiveness?: number | null
          recognition?: number | null
          submitted_on?: string | null
          work_life_balance?: number | null
          would_recommend?: string | null
        }
        Update: {
          belonging?: number | null
          career_growth?: number | null
          created_at?: string
          department?: string | null
          diagnosis_id?: string
          employee_code?: string | null
          engagement_score?: number | null
          enps?: number | null
          id?: string
          manager?: string | null
          manager_effectiveness?: number | null
          recognition?: number | null
          submitted_on?: string | null
          work_life_balance?: number | null
          would_recommend?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "engagement_responses_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
        ]
      }
      one_on_ones: {
        Row: {
          action_committed: string | null
          attrition_risk: string | null
          created_at: string
          diagnosis_id: string
          feeling_score: number | null
          id: string
          last_one_on_one: string | null
          looking_elsewhere: string | null
          manager_name: string | null
          report_code: string | null
          report_name: string | null
          top_concern: string | null
        }
        Insert: {
          action_committed?: string | null
          attrition_risk?: string | null
          created_at?: string
          diagnosis_id: string
          feeling_score?: number | null
          id?: string
          last_one_on_one?: string | null
          looking_elsewhere?: string | null
          manager_name?: string | null
          report_code?: string | null
          report_name?: string | null
          top_concern?: string | null
        }
        Update: {
          action_committed?: string | null
          attrition_risk?: string | null
          created_at?: string
          diagnosis_id?: string
          feeling_score?: number | null
          id?: string
          last_one_on_one?: string | null
          looking_elsewhere?: string | null
          manager_name?: string | null
          report_code?: string | null
          report_name?: string | null
          top_concern?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "one_on_ones_diagnosis_id_fkey"
            columns: ["diagnosis_id"]
            isOneToOne: false
            referencedRelation: "diagnoses"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      diagnosis_status: "draft" | "analyzing" | "ready" | "failed"
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
      diagnosis_status: ["draft", "analyzing", "ready", "failed"],
    },
  },
} as const
