import { createBrowserClient } from '@supabase/ssr'

// 声明 Supabase 数据库类型
type Database = {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string
          name: string
          slug: string
          avatar_url: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: string
          weight: number
          nickname: string | null
          joined_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      decisions: {
        Row: {
          id: string
          team_id: string
          title: string
          description: string | null
          vote_type: string
          status: string
          created_by: string
          voting_start: string | null
          voting_end: string | null
          pass_threshold: number
          total_score: number | null
          final_result: string | null
          round: number
          ai_insight: unknown
          created_at: string
          updated_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      options: {
        Row: {
          id: string
          decision_id: string
          content: string
          description: string | null
          order_index: number
          created_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      votes: {
        Row: {
          id: string
          decision_id: string
          option_id: string
          user_id: string
          weight: number
          comment: string | null
          round: number
          created_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      comments: {
        Row: {
          id: string
          decision_id: string
          user_id: string
          content: string
          parent_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      executions: {
        Row: {
          id: string
          decision_id: string
          title: string
          assignee_id: string | null
          due_date: string | null
          status: string
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: Record<string, unknown>
        Update: Record<string, unknown>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
