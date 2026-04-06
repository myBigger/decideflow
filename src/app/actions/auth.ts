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

  // 返回成功标识，由客户端执行跳转
  // （Server Action 的 redirect 在 Vercel Serverless 中可能导致 cookie 未被正确设置）
  return { success: true }
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

  // 注册成功后直接跳转到登录页，并带上 registered=1 让登录页显示友好提示
  redirect('/auth/login?registered=1')
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
