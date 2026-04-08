// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 * Uses x-user-id header set by middleware for reliability
 */
export async function GET() {
  try {
    // Get user ID from middleware header (set after cookie validation)
    const headersList = await headers()
    const userId = headersList.get('x-user-id')
    const userEmail = headersList.get('x-user-email')

    if (!userId) {
      // Fallback: use server client to validate session from cookies
      const supabase = await createClient()
      const { data: { user }, error: authError } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json(
          { authenticated: false, user: null },
          { status: 401 }
        )
      }

      // Fetch profile and teams
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

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

      return NextResponse.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          full_name: profile?.full_name,
          avatar_url: profile?.avatar_url,
          created_at: profile?.created_at,
        },
        teams: memberships || [],
      })
    }

    // Use user info from middleware header
    const supabase = await createClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

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
      .eq('user_id', userId)

    return NextResponse.json({
      authenticated: true,
      user: {
        id: userId,
        email: userEmail || profile?.email || '',
        full_name: profile?.full_name,
        avatar_url: profile?.avatar_url,
        created_at: profile?.created_at,
      },
      teams: memberships || [],
    })
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 500 }
    )
  }
}
