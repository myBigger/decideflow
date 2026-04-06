import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/auth/me
 * 获取当前登录用户信息
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { authenticated: false, user: null },
        { status: 401 }
      )
    }

    // 获取 profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // 获取用户所属团队
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
  } catch (error) {
    console.error('Get user error:', error)
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 500 }
    )
  }
}
