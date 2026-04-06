import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/decisions
 * 获取决策列表（支持筛选和分页）
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')
    const status = searchParams.get('status') // 'voting' | 'passed' | 'draft' | 'all'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // 获取用户所属团队
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', user.id)

    const teamIds = teamId
      ? [teamId]
      : (memberships?.map(m => m.team_id) || [])

    if (teamIds.length === 0) {
      return NextResponse.json({
        success: true,
        decisions: [],
        total: 0,
        page,
        pageSize,
      })
    }

    let query = supabase
      .from('decisions')
      .select(`
        *,
        creator:profiles!decisions_created_by_fkey (
          id,
          full_name,
          avatar_url
        ),
        team:teams (
          id,
          name,
          slug
        ),
        options (
          id,
          content,
          order_index
        ),
        _count:votes (count)
      `, { count: 'exact' })

    // 团队筛选
    if (teamIds.length === 1) {
      query = query.eq('team_id', teamIds[0])
    } else {
      query = query.in('team_id', teamIds)
    }

    // 状态筛选
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    // 排序
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy as any, { ascending })

    // 分页
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data: decisions, error, count } = await query

    if (error) {
      console.error('Get decisions error:', error)
      return NextResponse.json({ error: '获取决策列表失败' }, { status: 500 })
    }

    // 获取每个决策的投票统计
    const decisionsWithStats = await Promise.all(
      (decisions || []).map(async (decision) => {
        const { count: voteCount } = await supabase
          .from('votes')
          .select('*', { count: 'exact', head: true })
          .eq('decision_id', decision.id)

        return {
          ...decision,
          vote_count: voteCount || 0,
        }
      })
    )

    return NextResponse.json({
      success: true,
      decisions: decisionsWithStats,
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    })
  } catch (error) {
    console.error('Get decisions error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

/**
 * POST /api/decisions
 * 创建新决策
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const {
      team_id,
      title,
      description,
      vote_type,
      pass_threshold,
      voting_days,
      options: optionContents,
      start_voting = true,
    } = await request.json()

    // 验证必填字段
    if (!team_id || !title || !optionContents || optionContents.length < 2) {
      return NextResponse.json(
        { error: '缺少必填字段或投票选项不足' },
        { status: 400 }
      )
    }

    // 验证用户属于该团队
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: '无权限在该团队创建决策' }, { status: 403 })
    }

    // 计算投票时间
    const votingStart = start_voting ? new Date().toISOString() : null
    const votingEnd = voting_days
      ? new Date(Date.now() + voting_days * 24 * 60 * 60 * 1000).toISOString()
      : null

    // 创建决策
    const { data: decision, error: decisionError } = await supabase
      .from('decisions')
      .insert({
        team_id,
        title: title.trim(),
        description: description?.trim() || null,
        vote_type: vote_type || 'simple',
        pass_threshold: pass_threshold || 50,
        voting_start: votingStart,
        voting_end: votingEnd,
        created_by: user.id,
        status: start_voting ? 'voting' : 'draft',
      })
      .select()
      .single()

    if (decisionError) {
      return NextResponse.json({ error: '创建决策失败' }, { status: 500 })
    }

    // 创建投票选项
    const optionsToInsert = optionContents
      .filter((content: string) => content && content.trim())
      .map((content: string, index: number) => ({
        decision_id: decision.id,
        content: content.trim(),
        order_index: index,
      }))

    if (optionsToInsert.length > 0) {
      const { error: optionsError } = await supabase
        .from('options')
        .insert(optionsToInsert)

      if (optionsError) {
        // 回滚：删除决策
        await supabase.from('decisions').delete().eq('id', decision.id)
        return NextResponse.json({ error: '创建投票选项失败' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      decision,
      options: optionsToInsert,
      message: start_voting ? '决策已创建并开始投票' : '决策草稿已保存',
    })
  } catch (error) {
    console.error('Create decision error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
