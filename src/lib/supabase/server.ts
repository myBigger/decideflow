import { createServerClient, CookieOptionsWithName } from '@supabase/ssr'
import { cookies } from 'next/headers'

// ──────────────────────────────────────────────
// Database Types (inline to avoid inference issues)
// ──────────────────────────────────────────────

type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; email: string; full_name: string | null; avatar_url: string | null; created_at: string }
        Insert: { id: string; email: string; full_name?: string | null; avatar_url?: string | null; created_at?: string }
        Update: { id?: string; email?: string; full_name?: string | null; avatar_url?: string | null; created_at?: string }
      }
      teams: {
        Row: { id: string; name: string; slug: string; avatar_url: string | null; owner_id: string; created_at: string; updated_at: string }
        Insert: { id?: string; name: string; slug: string; avatar_url?: string | null; owner_id: string; created_at?: string; updated_at?: string }
        Update: { id?: string; name?: string; slug?: string; avatar_url?: string | null; owner_id?: string; created_at?: string; updated_at?: string }
      }
      team_members: {
        Row: { id: string; team_id: string; user_id: string; role: string; weight: number; nickname: string | null; joined_at: string }
        Insert: { id?: string; team_id: string; user_id: string; role?: string; weight?: number; nickname?: string | null; joined_at?: string }
        Update: { id?: string; team_id?: string; user_id?: string; role?: string; weight?: number; nickname?: string | null; joined_at?: string }
      }
      decisions: {
        Row: { id: string; team_id: string; title: string; description: string | null; vote_type: string; status: string; created_by: string; voting_start: string | null; voting_end: string | null; pass_threshold: number; total_score: number | null; final_result: string | null; round: number; ai_insight: Json | null; created_at: string; updated_at: string }
        Insert: { id?: string; team_id: string; title: string; description?: string | null; vote_type?: string; status?: string; created_by: string; voting_start?: string | null; voting_end?: string | null; pass_threshold?: number; total_score?: number | null; final_result?: string | null; round?: number; ai_insight?: Json | null; created_at?: string; updated_at?: string }
        Update: { id?: string; team_id?: string; title?: string; description?: string | null; vote_type?: string; status?: string; created_by?: string; voting_start?: string | null; voting_end?: string | null; pass_threshold?: number; total_score?: number | null; final_result?: string | null; round?: number; ai_insight?: Json | null; created_at?: string; updated_at?: string }
      }
      options: {
        Row: { id: string; decision_id: string; content: string; description: string | null; order_index: number; created_at: string }
        Insert: { id?: string; decision_id: string; content: string; description?: string | null; order_index?: number; created_at?: string }
        Update: { id?: string; decision_id?: string; content?: string; description?: string | null; order_index?: number; created_at?: string }
      }
      votes: {
        Row: { id: string; decision_id: string; option_id: string; user_id: string; weight: number; comment: string | null; round: number; created_at: string }
        Insert: { id?: string; decision_id: string; option_id: string; user_id: string; weight?: number; comment?: string | null; round?: number; created_at?: string }
        Update: { id?: string; decision_id?: string; option_id?: string; user_id?: string; weight?: number; comment?: string | null; round?: number; created_at?: string }
      }
      comments: {
        Row: { id: string; decision_id: string; user_id: string; content: string; parent_id: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; decision_id: string; user_id: string; content: string; parent_id?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; decision_id?: string; user_id?: string; content?: string; parent_id?: string | null; created_at?: string; updated_at?: string }
      }
      executions: {
        Row: { id: string; decision_id: string; title: string; assignee_id: string | null; due_date: string | null; status: string; completed_at: string | null; created_at: string; updated_at: string }
        Insert: { id?: string; decision_id: string; title: string; assignee_id?: string | null; due_date?: string | null; status?: string; completed_at?: string | null; created_at?: string; updated_at?: string }
        Update: { id?: string; decision_id?: string; title?: string; assignee_id?: string | null; due_date?: string | null; status?: string; completed_at?: string | null; created_at?: string; updated_at?: string }
      }
    }
    Views: Record<string, never>; Functions: Record<string, never>; Enums: Record<string, never>
  }
}

// ──────────────────────────────────────────────
// Create Server Client
// ──────────────────────────────────────────────

export async function createClient() {
  const cookieStore = await cookies()

  const isProduction = process.env.NODE_ENV === 'production'

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: CookieOptionsWithName[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                httpOnly: options?.httpOnly ?? true,
                secure: options?.secure ?? isProduction,
                sameSite: (options?.sameSite ?? 'lax') as 'lax' | 'strict' | 'none',
                path: options?.path ?? '/',
                domain: options?.domain,
                maxAge: options?.maxAge,
              })
            })
          } catch {
            // Server Component / middleware context - ignore
          }
        },
      },
    }
  )
}
