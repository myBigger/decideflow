// ============================================================
// Dec ideFlow — Supabase Database Types
// ============================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ──────────────────────────────────────────────
// Enums
// ──────────────────────────────────────────────

export type VoteType = 'simple' | 'weighted' | 'anonymous' | 'two_round'
export type DecisionStatus = 'draft' | 'voting' | 'passed' | 'rejected' | 'archived'
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer'

// ──────────────────────────────────────────────
// Tables
// ──────────────────────────────────────────────

export interface Database {
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
        Insert: {
          id?: string
          name: string
          slug: string
          avatar_url?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
          avatar_url?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }

      team_members: {
        Row: {
          id: string
          team_id: string
          user_id: string
          role: UserRole
          weight: number // 投票权重
          nickname: string | null
          joined_at: string
        }
        Insert: {
          id?: string
          team_id: string
          user_id: string
          role?: UserRole
          weight?: number
          nickname?: string | null
          joined_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          user_id?: string
          role?: UserRole
          weight?: number
          nickname?: string | null
          joined_at?: string
        }
      }

      decisions: {
        Row: {
          id: string
          team_id: string
          title: string
          description: string | null
          vote_type: VoteType
          status: DecisionStatus
          created_by: string
          voting_start: string | null
          voting_end: string | null
          pass_threshold: number // 通过阈值百分比
          total_score: number | null
          final_result: 'passed' | 'rejected' | null
          round: number // 用于两轮制
          ai_insight: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          team_id: string
          title: string
          description?: string | null
          vote_type: VoteType
          status?: DecisionStatus
          created_by: string
          voting_start?: string | null
          voting_end?: string | null
          pass_threshold?: number
          total_score?: number | null
          final_result?: 'passed' | 'rejected' | null
          round?: number
          ai_insight?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          team_id?: string
          title?: string
          description?: string | null
          vote_type?: VoteType
          status?: DecisionStatus
          created_by?: string
          voting_start?: string | null
          voting_end?: string | null
          pass_threshold?: number
          total_score?: number | null
          final_result?: 'passed' | 'rejected' | null
          round?: number
          ai_insight?: Json | null
          created_at?: string
          updated_at?: string
        }
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
        Insert: {
          id?: string
          decision_id: string
          content: string
          description?: string | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          decision_id?: string
          content?: string
          description?: string | null
          order_index?: number
          created_at?: string
        }
      }

      votes: {
        Row: {
          id: string
          decision_id: string
          option_id: string
          user_id: string
          weight: number // 投票时记录的权重（后续可能变更）
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          decision_id: string
          option_id: string
          user_id: string
          weight?: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          decision_id?: string
          option_id?: string
          user_id?: string
          weight?: number
          comment?: string | null
          created_at?: string
        }
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
        Insert: {
          id?: string
          decision_id: string
          user_id: string
          content: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          decision_id?: string
          user_id?: string
          content?: string
          parent_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      executions: {
        Row: {
          id: string
          decision_id: string
          title: string
          assignee_id: string | null
          due_date: string | null
          status: 'pending' | 'in_progress' | 'completed' | 'overdue'
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          decision_id: string
          title: string
          assignee_id?: string | null
          due_date?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'overdue'
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          decision_id?: string
          title?: string
          assignee_id?: string | null
          due_date?: string | null
          status?: 'pending' | 'in_progress' | 'completed' | 'overdue'
          completed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }

      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
        }
      }
    }
    Views: {}
    Functions: {}
    Enums: {}
  }
}

// ──────────────────────────────────────────────
// Convenience Types
// ──────────────────────────────────────────────

export type Decision = Database['public']['Tables']['decisions']['Row']
export type DecisionInsert = Database['public']['Tables']['decisions']['Insert']
export type Option = Database['public']['Tables']['options']['Row']
export type Vote = Database['public']['Tables']['votes']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type TeamMember = Database['public']['Tables']['team_members']['Row']
export type Execution = Database['public']['Tables']['executions']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']

// ──────────────────────────────────────────────
// AI Insight Structure
// ──────────────────────────────────────────────

export interface AIInsight {
  before?: {
    warnings: string[]
    similar_decisions: Array<{
      id: string
      title: string
      outcome: string
      lesson: string
    }>
    suggestions: string[]
  }
  after?: {
    summary: string
    execution_priorities: string[]
    risk_factors: string[]
    next_review_date: string
  }
}
