// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * GET /api/teams/[teamId]
 * 获取指定团队详情
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 验证用户是否属于该团队
    const { data: membership } = await supabase
      .from('team_members')
      .select('role, weight')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: '无权限访问该团队' }, { status: 403 })
    }

    // 获取团队信息
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (teamError || !team) {
      return NextResponse.json({ error: '团队不存在' }, { status: 404 })
    }

    // 获取团队成员列表
    const { data: members } = await supabase
      .from('team_members')
      .select(`
        id,
        role,
        weight,
        nickname,
        joined_at,
        profiles (
          id,
          email,
          full_name,
          avatar_url
        )
      `)
      .eq('team_id', teamId)
      .order('joined_at', { ascending: true })

    // 获取团队统计
    const { count: decisionCount } = await supabase
      .from('decisions')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)

    const { count: votingCount } = await supabase
      .from('decisions')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', teamId)
      .eq('status', 'voting')

    return NextResponse.json({
      success: true,
      team,
      members: members || [],
      stats: {
        total_decisions: decisionCount || 0,
        voting: votingCount || 0,
        total_members: members?.length || 0,
      },
      currentUserRole: membership.role,
      currentUserWeight: membership.weight,
    })
  } catch (error) {
    console.error('Get team error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
