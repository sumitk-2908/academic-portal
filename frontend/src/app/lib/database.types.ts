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
      degrees: {
        Row: {
          created_at: string | null
          id: number
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
        }
        Relationships: []
      }
      document_analytics: {
        Row: {
          document_id: number
          download_count: number | null
          last_accessed: string | null
          view_count: number | null
        }
        Insert: {
          document_id: number
          download_count?: number | null
          last_accessed?: string | null
          view_count?: number | null
        }
        Update: {
          document_id?: number
          download_count?: number | null
          last_accessed?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_analytics_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_analytics_doc"
            columns: ["document_id"]
            isOneToOne: true
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string
          created_at: string | null
          file_size: number | null
          file_url: string
          id: number
          module_id: number | null
          page_count: number | null
          status: string | null
          subject: string
          thumbnail_url: string | null
          title: string
          uploaded_by: string
        }
        Insert: {
          category: string
          created_at?: string | null
          file_size?: number | null
          file_url: string
          id?: number
          module_id?: number | null
          page_count?: number | null
          status?: string | null
          subject: string
          thumbnail_url?: string | null
          title: string
          uploaded_by?: string
        }
        Update: {
          category?: string
          created_at?: string | null
          file_size?: number | null
          file_url?: string
          id?: number
          module_id?: number | null
          page_count?: number | null
          status?: string | null
          subject?: string
          thumbnail_url?: string | null
          title?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      modules: {
        Row: {
          created_at: string | null
          id: number
          module_number: number
          name: string | null
          subject_id: number | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          module_number: number
          name?: string | null
          subject_id?: number | null
        }
        Update: {
          created_at?: string | null
          id?: number
          module_number?: number
          name?: string | null
          subject_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      semesters: {
        Row: {
          degree_id: number | null
          id: number
          semester_number: number
        }
        Insert: {
          degree_id?: number | null
          id?: number
          semester_number: number
        }
        Update: {
          degree_id?: number | null
          id?: number
          semester_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "semesters_degree_id_fkey"
            columns: ["degree_id"]
            isOneToOne: false
            referencedRelation: "degrees"
            referencedColumns: ["id"]
          },
        ]
      }
      student_bookmarks: {
        Row: {
          created_at: string | null
          document_id: number
          id: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          document_id: number
          id?: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          document_id?: number
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_bookmark_doc"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_bookmarks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      student_history: {
        Row: {
          document_id: number
          id: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          document_id: number
          id?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          document_id?: number
          id?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_history_doc"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      study_history: {
        Row: {
          accessed_at: string
          document_id: number
          id: number
          user_id: string
        }
        Insert: {
          accessed_at?: string
          document_id: number
          id?: number
          user_id: string
        }
        Update: {
          accessed_at?: string
          document_id?: number
          id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_history_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string | null
          id: number
          is_non_module: boolean | null
          name: string
          slug: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          is_non_module?: boolean | null
          name: string
          slug: string
        }
        Update: {
          created_at?: string | null
          id?: number
          is_non_module?: boolean | null
          name?: string
          slug?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          role: string
          user_id: string
        }
        Insert: {
          role?: string
          user_id: string
        }
        Update: {
          role?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_doc_stat: {
        Args: { doc_id: number; stat_type: string }
        Returns: undefined
      }
    }
    Enums: {
      doccategory: "pyq" | "tutorial_sheet" | "notes" | "syllabus"
      reviewstatus: "pending" | "approved" | "rejected"
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
      doccategory: ["pyq", "tutorial_sheet", "notes", "syllabus"],
      reviewstatus: ["pending", "approved", "rejected"],
    },
  },
} as const
