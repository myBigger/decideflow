// @ts-nocheck
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// ──────────────────────────────────────────────
// Login
// ──────────────────────────────────────────────

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: '邮箱和密码不能为空' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: '邮箱或密码错误' }
  }

  // Server Action redirects are the most reliable way
  redirect('/dashboard')
}

// ──────────────────────────────────────────────
// Register
// ──────────────────────────────────────────────

export async function register(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = (formData.get('fullName') as string) || ''

  if (!email || !password) {
    return { error: '邮箱和密码不能为空' }
  }

  if (password.length < 6) {
    return { error: '密码至少需要6个字符' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    return { error: error.message || '注册失败，请稍后重试' }
  }

  return { success: true, message: '注册成功！请查收验证邮件，然后登录' }
}

// ──────────────────────────────────────────────
// Logout
// ──────────────────────────────────────────────

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/login')
}

// ──────────────────────────────────────────────
// Get current session (for client components)
// ──────────────────────────────────────────────

export async function getSession() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return { authenticated: false, user: null }
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch teams
  const { data: memberships } = await supabase
    .from('team_members')
    .select(`
      role,
      weight,
      teams (
        id,
        name,
        slug,
        avatar_url
      )
    `)
    .eq('user_id', user.id)

  return {
    authenticated: true,
    user: {
      id: user.id,
      email: user.email ?? '',
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    },
    teams: memberships ?? [],
  }
}
