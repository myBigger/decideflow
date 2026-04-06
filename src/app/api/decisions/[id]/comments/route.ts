// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/decisions/[id]/comments
 * 获取决策的所有评论
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

    // 获取评论（包含回复）
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        author:profiles!comments_user_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .eq('decision_id', decisionId)
      .is('parent_id', null)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: '获取评论失败' }, { status: 500 })
    }

    // 获取所有回复
    if (comments && comments.length > 0) {
      const { data: replies } = await supabase
        .from('comments')
        .select(`
          *,
          author:profiles!comments_user_id_fkey (
            id,
            full_name,
            avatar_url
          )
        `)
        .in('parent_id', comments.map(c => c.id))
        .order('created_at', { ascending: true })

      // 将回复附加到对应评论
      const commentsWithReplies = comments.map(comment => ({
        ...comment,
        replies: replies?.filter(r => r.parent_id === comment.id) || [],
      }))

      return NextResponse.json({
        success: true,
        comments: commentsWithReplies,
        total: comments.length,
      })
    }

    return NextResponse.json({
      success: true,
      comments: [],
      total: 0,
    })
  } catch (error) {
    console.error('Get comments error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

/**
 * POST /api/decisions/[id]/comments
 * 添加评论
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

    const { content, parent_id } = await request.json()

    if (!content || content.trim().length === 0) {
      return NextResponse.json({ error: '评论内容不能为空' }, { status: 400 })
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: '评论内容不能超过2000字' }, { status: 400 })
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
      return NextResponse.json({ error: '无权限评论该决策' }, { status: 403 })
    }

    // 验证回复目标
    if (parent_id) {
      const { data: parentComment } = await supabase
        .from('comments')
        .select('id')
        .eq('id', parent_id)
        .eq('decision_id', decisionId)
        .single()

      if (!parentComment) {
        return NextResponse.json({ error: '回复目标不存在' }, { status: 404 })
      }
    }

    // 创建评论
    const { data: comment, error: insertError } = await supabase
      .from('comments')
      .insert({
        decision_id: decisionId,
        user_id: user.id,
        content: content.trim(),
        parent_id: parent_id || null,
      })
      .select(`
        *,
        author:profiles!comments_user_id_fkey (
          id,
          full_name,
          avatar_url
        )
      `)
      .single()

    if (insertError) {
      return NextResponse.json({ error: '评论失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      comment: {
        ...comment,
        replies: [],
      },
      message: '评论已发布',
    })
  } catch (error) {
    console.error('Add comment error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
