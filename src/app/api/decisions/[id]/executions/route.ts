// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * GET /api/decisions/[id]/executions
 * 获取决策的执行任务列表
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: decisionId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { data: executions, error } = await supabase
      .from('executions')
      .select(`
        *,
        assignee:profiles!executions_assignee_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('decision_id', decisionId)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: '获取执行任务失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      executions: executions || [],
    })
  } catch (error) {
    console.error('Get executions error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

/**
 * POST /api/decisions/[id]/executions
 * 创建执行任务
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: decisionId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { title, assignee_id, due_date } = await request.json()

    if (!title || title.trim().length === 0) {
      return NextResponse.json({ error: '任务标题不能为空' }, { status: 400 })
    }

    // 验证决策存在
    const { data: decision } = await supabase
      .from('decisions')
      .select('team_id')
      .eq('id', decisionId)
      .single()

    if (!decision) {
      return NextResponse.json({ error: '决策不存在' }, { status: 404 })
    }

    // 验证用户在团队中
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', decision.team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: '无权限为该决策创建任务' }, { status: 403 })
    }

    // 验证 assignee 属于同一团队
    if (assignee_id) {
      const { data: assigneeMembership } = await supabase
        .from('team_members')
        .select('id')
        .eq('team_id', decision.team_id)
        .eq('user_id', assignee_id)
        .single()

      if (!assigneeMembership) {
        return NextResponse.json(
          { error: '指定的负责人不在团队中' },
          { status: 400 }
        )
      }
    }

    // 创建执行任务
    const { data: execution, error: insertError } = await supabase
      .from('executions')
      .insert({
        decision_id: decisionId,
        title: title.trim(),
        assignee_id: assignee_id || null,
        due_date: due_date || null,
        status: 'pending',
      })
      .select(`
        *,
        assignee:profiles!executions_assignee_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (insertError) {
      return NextResponse.json({ error: '创建任务失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      execution,
      message: '执行任务已创建',
    })
  } catch (error) {
    console.error('Create execution error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

/**
 * PATCH /api/decisions/[id]/executions
 * 更新执行任务状态
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: decisionId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { execution_id, status, title, assignee_id, due_date } = await request.json()

    if (!execution_id) {
      return NextResponse.json({ error: '缺少任务ID' }, { status: 400 })
    }

    // 验证决策存在
    const { data: decision } = await supabase
      .from('decisions')
      .select('team_id')
      .eq('id', decisionId)
      .single()

    if (!decision) {
      return NextResponse.json({ error: '决策不存在' }, { status: 404 })
    }

    // 验证用户在团队中
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', decision.team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: '无权限更新该任务' }, { status: 403 })
    }

    const updates: Record<string, any> = {}
    if (status !== undefined) {
      updates.status = status
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString()
      }
    }
    if (title !== undefined) updates.title = title.trim()
    if (assignee_id !== undefined) updates.assignee_id = assignee_id
    if (due_date !== undefined) updates.due_date = due_date

    const { data: execution, error: updateError } = await supabase
      .from('executions')
      .update(updates)
      .eq('id', execution_id)
      .eq('decision_id', decisionId)
      .select(`
        *,
        assignee:profiles!executions_assignee_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (updateError) {
      return NextResponse.json({ error: '更新任务失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      execution,
      message: status === 'completed' ? '任务已完成' : '任务已更新',
    })
  } catch (error) {
    console.error('Update execution error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
