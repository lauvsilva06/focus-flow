export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      modules: {
        Row: {
          course_id: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          position: number;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          position?: number;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          position?: number;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "modules_course_owner_fkey";
            columns: ["course_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      goals: {
        Row: {
          created_at: string;
          id: string;
          period: string;
          subject_id: string | null;
          target_hours: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          period: string;
          subject_id?: string | null;
          target_hours: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          period?: string;
          subject_id?: string | null;
          target_hours?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "goals_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      pomodoro_settings: {
        Row: {
          auto_start_break: boolean;
          auto_start_next: boolean;
          created_at: string;
          focus_minutes: number;
          long_break_minutes: number;
          notifications_enabled: boolean;
          pomodoros_per_cycle: number;
          short_break_minutes: number;
          sound_enabled: boolean;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          auto_start_break?: boolean;
          auto_start_next?: boolean;
          created_at?: string;
          focus_minutes?: number;
          long_break_minutes?: number;
          notifications_enabled?: boolean;
          pomodoros_per_cycle?: number;
          short_break_minutes?: number;
          sound_enabled?: boolean;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          auto_start_break?: boolean;
          auto_start_next?: boolean;
          created_at?: string;
          focus_minutes?: number;
          long_break_minutes?: number;
          notifications_enabled?: boolean;
          pomodoros_per_cycle?: number;
          short_break_minutes?: number;
          sound_enabled?: boolean;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      study_sessions: {
        Row: {
          client_session_id: string;
          completed: boolean;
          created_at: string;
          duration_minutes: number;
          effective_duration_minutes: number;
          finished_at: string | null;
          id: string;
          module_id: string | null;
          notes: string | null;
          objective: string | null;
          planned_duration_minutes: number;
          rating: string | null;
          session_type: string;
          started_at: string;
          status: string;
          study_mode: string | null;
          subject_id: string | null;
          topic_id: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          client_session_id?: string;
          completed?: boolean;
          created_at?: string;
          duration_minutes?: number;
          effective_duration_minutes: number;
          finished_at?: string | null;
          id?: string;
          module_id?: string | null;
          notes?: string | null;
          objective?: string | null;
          planned_duration_minutes: number;
          rating?: string | null;
          session_type?: string;
          started_at?: string;
          status?: string;
          study_mode?: string | null;
          subject_id?: string | null;
          topic_id?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          client_session_id?: string;
          completed?: boolean;
          created_at?: string;
          duration_minutes?: number;
          effective_duration_minutes?: number;
          finished_at?: string | null;
          id?: string;
          module_id?: string | null;
          notes?: string | null;
          objective?: string | null;
          planned_duration_minutes?: number;
          rating?: string | null;
          session_type?: string;
          started_at?: string;
          status?: string;
          study_mode?: string | null;
          subject_id?: string | null;
          topic_id?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sessions_module_hierarchy_fkey";
            columns: ["module_id", "subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id", "course_id", "user_id"];
          },
          {
            foreignKeyName: "sessions_topic_hierarchy_fkey";
            columns: ["topic_id", "module_id", "subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id", "module_id", "subject_id", "user_id"];
          },
          {
            foreignKeyName: "study_sessions_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "study_sessions_topic_id_fkey";
            columns: ["topic_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id"];
          },
        ];
      };
      study_session_items: {
        Row: {
          completed_during_session: boolean;
          created_at: string;
          item_id: string;
          session_id: string;
          topic_id: string;
          user_id: string;
        };
        Insert: {
          completed_during_session?: boolean;
          created_at?: string;
          item_id: string;
          session_id: string;
          topic_id: string;
          user_id: string;
        };
        Update: {
          completed_during_session?: boolean;
          created_at?: string;
          item_id?: string;
          session_id?: string;
          topic_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "session_items_session_topic_owner_fkey";
            columns: ["session_id", "topic_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "study_sessions";
            referencedColumns: ["id", "topic_id", "user_id"];
          },
          {
            foreignKeyName: "session_items_item_topic_owner_fkey";
            columns: ["item_id", "topic_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "topic_items";
            referencedColumns: ["id", "topic_id", "user_id"];
          },
        ];
      };
      subjects: {
        Row: {
          color: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          status: string;
          priority: string | null;
          target_completion_date: string | null;
          updated_at: string;
          user_id: string;
          weekly_goal_hours: number | null;
        };
        Insert: {
          color?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          status?: string;
          priority?: string | null;
          target_completion_date?: string | null;
          updated_at?: string;
          user_id: string;
          weekly_goal_hours?: number | null;
        };
        Update: {
          color?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          status?: string;
          priority?: string | null;
          target_completion_date?: string | null;
          updated_at?: string;
          user_id?: string;
          weekly_goal_hours?: number | null;
        };
        Relationships: [];
      };
      topics: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          module_id: string;
          name: string;
          progress: number;
          position: number;
          status: string;
          subject_id: string;
          updated_at: string;
          user_id: string;
          notes: string | null;
          last_reviewed_at: string | null;
          next_review_at: string | null;
          review_interval_days: number | null;
          review_count: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          module_id: string;
          name: string;
          progress?: number;
          position?: number;
          status?: string;
          subject_id: string;
          updated_at?: string;
          user_id: string;
          notes?: string | null;
          last_reviewed_at?: string | null;
          next_review_at?: string | null;
          review_interval_days?: number | null;
          review_count?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          module_id?: string;
          name?: string;
          progress?: number;
          position?: number;
          status?: string;
          subject_id?: string;
          updated_at?: string;
          user_id?: string;
          notes?: string | null;
          last_reviewed_at?: string | null;
          next_review_at?: string | null;
          review_interval_days?: number | null;
          review_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "topics_module_hierarchy_fkey";
            columns: ["module_id", "subject_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "modules";
            referencedColumns: ["id", "course_id", "user_id"];
          },
          {
            foreignKeyName: "topics_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
        ];
      };
      topic_items: {
        Row: {
          completed: boolean;
          completed_at: string | null;
          created_at: string;
          description: string | null;
          id: string;
          item_type: string;
          position: number;
          title: string;
          topic_id: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          item_type?: string;
          position?: number;
          title: string;
          topic_id: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          item_type?: string;
          position?: number;
          title?: string;
          topic_id?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topic_items_topic_owner_fkey";
            columns: ["topic_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
      topic_materials: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          title: string;
          url: string;
          material_type: string;
          description: string | null;
          completed: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id: string;
          title: string;
          url: string;
          material_type?: string;
          description?: string | null;
          completed?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic_id?: string;
          title?: string;
          url?: string;
          material_type?: string;
          description?: string | null;
          completed?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "topic_materials_topic_owner_fkey";
            columns: ["topic_id", "user_id"];
            isOneToOne: false;
            referencedRelation: "topics";
            referencedColumns: ["id", "user_id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
