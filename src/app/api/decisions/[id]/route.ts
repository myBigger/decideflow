// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * GET /api/decisions/[id]
 * 获取决策详情
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 获取决策
    const { data: decision, error: decisionError } = await supabase
      .from('decisions')
      .select(`
        *,
        creator:profiles!decisions_created_by_fkey (
          id,
          email,
          full_name,
          avatar_url
        ),
        team:teams (
          id,
          name,
          slug
        )
      `)
      .eq('id', id)
      .single()

    if (decisionError || !decision) {
      return NextResponse.json({ error: '决策不存在' }, { status: 404 })
    }

    // 验证权限
    const { data: membership } = await supabase
      .from('team_members')
      .select('role, weight')
      .eq('team_id', decision.team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: '无权限访问该决策' }, { status: 403 })
    }

    // 获取投票选项
    const { data: options } = await supabase
      .from('options')
      .select('*')
      .eq('decision_id', id)
      .order('order_index', { ascending: true })

    // 获取投票记录
    const { data: votes } = await supabase
      .from('votes')
      .select('*')
      .eq('decision_id', id)
      .order('created_at', { ascending: true })

    // 获取团队成员（用于加权投票）
    const { data: members } = await supabase
      .from('team_members')
      .select(`
        user_id,
        role,
        weight,
        profiles (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('team_id', decision.team_id)

    // 获取评论
    const { data: comments } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles!comments_user_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('decision_id', id)
      .is('parent_id', null)
      .order('created_at', { ascending: true })

    // 获取执行任务
    const { data: executions } = await supabase
      .from('executions')
      .select(`
        *,
        assignee:profiles!executions_assignee_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('decision_id', id)
      .order('created_at', { ascending: true })

    // 计算投票结果
    const { calculateVotingResults } = await import('@/lib/vote-engine')
    const voteResults = calculateVotingResults(
      options || [],
      votes || [],
      members || [],
      decision.vote_type,
      decision.pass_threshold,
      decision.round
    )

    // 获取当前用户是否已投票
    const userVotes = votes?.filter(v => v.user_id === user.id) || []
    const hasVoted = userVotes.length > 0
    const userVoteOptionId = hasVoted ? userVotes[userVotes.length - 1].option_id : null

    // 判断是否过期
    const now = new Date()
    const isExpired = decision.voting_end
      ? new Date(decision.voting_end) < now
      : false

    return NextResponse.json({
      success: true,
      decision,
      options,
      votes,
      vote_results: voteResults,
      members,
      comments,
      executions,
      current_user_vote: hasVoted ? {
        option_id: userVoteOptionId,
        comment: userVotes[userVotes.length - 1].comment,
      } : null,
      is_expired: isExpired,
      current_user_role: membership.role,
      current_user_weight: membership.weight,
    })
  } catch (error) {
    console.error('Get decision error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

/**
 * PATCH /api/decisions/[id]
 * 更新决策（状态、投票规则等）
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 获取决策
    const { data: decision } = await supabase
      .from('decisions')
      .select('team_id, created_by')
      .eq('id', id)
      .single()

    if (!decision) {
      return NextResponse.json({ error: '决策不存在' }, { status: 404 })
    }

    // 验证权限
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', decision.team_id)
      .eq('user_id', user.id)
      .single()

    const canEdit = membership?.role === 'owner' ||
                     membership?.role === 'admin' ||
                     decision.created_by === user.id

    if (!canEdit) {
      return NextResponse.json({ error: '无权限修改该决策' }, { status: 403 })
    }

    const updates = await request.json()

    // 允许更新的字段
    const allowedUpdates: Record<string, any> = {}
    if (updates.title !== undefined && updates.title !== null) allowedUpdates.title = updates.title.trim()
    if (updates.description !== undefined) allowedUpdates.description = updates.description?.trim() || null
    if (updates.pass_threshold !== undefined) allowedUpdates.pass_threshold = updates.pass_threshold
    if (updates.voting_end !== undefined) allowedUpdates.voting_end = updates.voting_end
    if (updates.status !== undefined) allowedUpdates.status = updates.status
    if (updates.round !== undefined) allowedUpdates.round = updates.round
    if (updates.final_result !== undefined) allowedUpdates.final_result = updates.final_result
    if (updates.ai_insight !== undefined) allowedUpdates.ai_insight = updates.ai_insight

    const { data: updated, error: updateError } = await supabase
      .from('decisions')
      .update(allowedUpdates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      decision: updated,
      message: '决策已更新',
    })
  } catch (error) {
    console.error('Update decision error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

/**
 * DELETE /api/decisions/[id]
 * 删除决策（仅草稿状态可删除）
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 获取决策
    const { data: decision } = await supabase
      .from('decisions')
      .select('team_id, created_by, status')
      .eq('id', id)
      .single()

    if (!decision) {
      return NextResponse.json({ error: '决策不存在' }, { status: 404 })
    }

    // 只能删除草稿状态的决策
    if (decision.status !== 'draft') {
      return NextResponse.json(
        { error: '只能删除草稿状态的决策' },
        { status: 400 }
      )
    }

    // 验证权限
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', decision.team_id)
      .eq('user_id', user.id)
      .single()

    const canDelete = membership?.role === 'owner' ||
                        membership?.role === 'admin' ||
                        decision.created_by === user.id

    if (!canDelete) {
      return NextResponse.json({ error: '无权限删除该决策' }, { status: 403 })
    }

    // Supabase 会自动删除关联的 options, votes, comments (CASCADE)
    const { error: deleteError } = await supabase
      .from('decisions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      return NextResponse.json({ error: '删除失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: '决策已删除',
    })
  } catch (error) {
    console.error('Delete decision error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
