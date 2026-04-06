import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

// 复制 client.ts 中的 Database 类型定义（保持一致）
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

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: ResponseCookie }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component - ignore
          }
        },
      },
    }
  )
}
