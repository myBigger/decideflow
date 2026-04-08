// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { generateSlug } from '@/lib/utils'

export const runtime = 'nodejs'

/**
 * GET /api/teams
 * 获取当前用户所属的所有团队
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { data: memberships, error: membershipError } = await supabase
      .from('team_members')
      .select(`
        role,
        weight,
        joined_at,
        teams (
          id,
          name,
          slug,
          avatar_url,
          owner_id,
          created_at
        )
      `)
      .eq('user_id', user.id)

    if (membershipError) {
      return NextResponse.json({ error: '获取团队列表失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      teams: memberships || [],
    })
  } catch (error) {
    console.error('Get teams error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

/**
 * POST /api/teams
 * 创建新团队
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { name } = await request.json()

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: '团队名称至少需要2个字符' },
        { status: 400 }
      )
    }

    const slug = generateSlug(name.trim())

    // 检查 slug 是否已被使用
    const { data: existing } = await supabase
      .from('teams')
      .select('id')
      .eq('slug', slug)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: '该团队名称已被使用' },
        { status: 409 }
      )
    }

    // 创建团队
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        slug,
        owner_id: user.id,
      })
      .select()
      .single()

    if (teamError) {
      return NextResponse.json({ error: '创建团队失败' }, { status: 500 })
    }

    // 自动将创建者添加为 owner
    const { error: memberError } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        user_id: user.id,
        role: 'owner',
        weight: 10,
        nickname: '创建者',
      })

    if (memberError) {
      // 回滚：删除已创建的团队
      await supabase.from('teams').delete().eq('id', team.id)
      return NextResponse.json({ error: '创建团队成员关系失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      team,
      message: '团队创建成功',
    })
  } catch (error) {
    console.error('Create team error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
