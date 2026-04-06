import { createBrowserClient } from '@supabase/ssr'

// ──────────────────────────────────────────────
// Supabase Database Types
// ──────────────────────────────────────────────

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

interface ProfilesRow {
  id: string; email: string; full_name: string | null
  avatar_url: string | null; created_at: string
}
interface ProfilesInsert { id: string; email: string; full_name?: string | null; avatar_url?: string | null; created_at?: string }
interface ProfilesUpdate { id?: string; email?: string; full_name?: string | null; avatar_url?: string | null; created_at?: string }

interface TeamsRow {
  id: string; name: string; slug: string; avatar_url: string | null
  owner_id: string; created_at: string; updated_at: string
}
interface TeamsInsert { id?: string; name: string; slug: string; avatar_url?: string | null; owner_id: string; created_at?: string; updated_at?: string }
interface TeamsUpdate { id?: string; name?: string; slug?: string; avatar_url?: string | null; owner_id?: string; created_at?: string; updated_at?: string }

interface TeamMembersRow {
  id: string; team_id: string; user_id: string; role: string
  weight: number; nickname: string | null; joined_at: string
}
interface TeamMembersInsert { id?: string; team_id: string; user_id: string; role?: string; weight?: number; nickname?: string | null; joined_at?: string }
interface TeamMembersUpdate { id?: string; team_id?: string; user_id?: string; role?: string; weight?: number; nickname?: string | null; joined_at?: string }

interface DecisionsRow {
  id: string; team_id: string; title: string; description: string | null
  vote_type: string; status: string; created_by: string
  voting_start: string | null; voting_end: string | null; pass_threshold: number
  total_score: number | null; final_result: string | null; round: number
  ai_insight: Json | null; created_at: string; updated_at: string
}
interface DecisionsInsert {
  id?: string; team_id: string; title: string; description?: string | null
  vote_type?: string; status?: string; created_by: string
  voting_start?: string | null; voting_end?: string | null; pass_threshold?: number
  total_score?: number | null; final_result?: string | null; round?: number
  ai_insight?: Json | null; created_at?: string; updated_at?: string
}
interface DecisionsUpdate {
  id?: string; team_id?: string; title?: string; description?: string | null
  vote_type?: string; status?: string; created_by?: string
  voting_start?: string | null; voting_end?: string | null; pass_threshold?: number
  total_score?: number | null; final_result?: string | null; round?: number
  ai_insight?: Json | null; created_at?: string; updated_at?: string
}

interface OptionsRow {
  id: string; decision_id: string; content: string
  description: string | null; order_index: number; created_at: string
}
interface OptionsInsert { id?: string; decision_id: string; content: string; description?: string | null; order_index?: number; created_at?: string }
interface OptionsUpdate { id?: string; decision_id?: string; content?: string; description?: string | null; order_index?: number; created_at?: string }

interface VotesRow {
  id: string; decision_id: string; option_id: string; user_id: string
  weight: number; comment: string | null; round: number; created_at: string
}
interface VotesInsert { id?: string; decision_id: string; option_id: string; user_id: string; weight?: number; comment?: string | null; round?: number; created_at?: string }
interface VotesUpdate { id?: string; decision_id?: string; option_id?: string; user_id?: string; weight?: number; comment?: string | null; round?: number; created_at?: string }

interface CommentsRow {
  id: string; decision_id: string; user_id: string; content: string
  parent_id: string | null; created_at: string; updated_at: string
}
interface CommentsInsert { id?: string; decision_id: string; user_id: string; content: string; parent_id?: string | null; created_at?: string; updated_at?: string }
interface CommentsUpdate { id?: string; decision_id?: string; user_id?: string; content?: string; parent_id?: string | null; created_at?: string; updated_at?: string }

interface ExecutionsRow {
  id: string; decision_id: string; title: string; assignee_id: string | null
  due_date: string | null; status: string; completed_at: string | null; created_at: string; updated_at: string
}
interface ExecutionsInsert { id?: string; decision_id: string; title: string; assignee_id?: string | null; due_date?: string | null; status?: string; completed_at?: string | null; created_at?: string; updated_at?: string }
interface ExecutionsUpdate { id?: string; decision_id?: string; title?: string; assignee_id?: string | null; due_date?: string | null; status?: string; completed_at?: string | null; created_at?: string; updated_at?: string }

type Database = {
  public: {
    Tables: {
      profiles: { Row: ProfilesRow; Insert: ProfilesInsert; Update: ProfilesUpdate }
      teams: { Row: TeamsRow; Insert: TeamsInsert; Update: TeamsUpdate }
      team_members: { Row: TeamMembersRow; Insert: TeamMembersInsert; Update: TeamMembersUpdate }
      decisions: { Row: DecisionsRow; Insert: DecisionsInsert; Update: DecisionsUpdate }
      options: { Row: OptionsRow; Insert: OptionsInsert; Update: OptionsUpdate }
      votes: { Row: VotesRow; Insert: VotesInsert; Update: VotesUpdate }
      comments: { Row: CommentsRow; Insert: CommentsInsert; Update: CommentsUpdate }
      executions: { Row: ExecutionsRow; Insert: ExecutionsInsert; Update: ExecutionsUpdate }
    }
    Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>
  }
}

// ──────────────────────────────────────────────
// Create Client
// ──────────────────────────────────────────────

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
