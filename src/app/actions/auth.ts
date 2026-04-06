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

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: '邮箱或密码错误' }
  }

  if (!data.session) {
    return { error: '登录失败，请稍后重试' }
  }

  // 返回 session 数据，由客户端用 setSession() 写入浏览器
  // 这样可以绕过 Vercel Serverless cookie 序列化时序问题
  return {
    success: true,
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      expires_in: data.session.expires_in,
    },
    user: data.user
      ? {
          id: data.user.id,
          email: data.user.email,
          user_metadata: data.user.user_metadata,
        }
      : null,
  }
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
  // 不再使用 redirect，让客户端执行跳转，确保 session 被清除
  return { success: true }
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
