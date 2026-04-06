// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/teams/[teamId]/invite
 * 邀请成员加入团队
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 验证权限：只有 owner 和 admin 可以邀请
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', teamId)
      .eq('user_id', user.id)
      .single()

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json(
        { error: '只有团队所有者和管理员可以邀请成员' },
        { status: 403 }
      )
    }

    const { email, role = 'member', weight = 1, nickname } = await request.json()

    if (!email) {
      return NextResponse.json({ error: '邮箱不能为空' }, { status: 400 })
    }

    // 查找被邀请的用户
    const { data: invitee, error: inviteeError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', email)
      .single()

    if (inviteeError || !invitee) {
      return NextResponse.json(
        { error: '该用户尚未注册 Dec ideFlow，请先邀请其注册' },
        { status: 404 }
      )
    }

    // 检查是否已在团队中
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('team_id', teamId)
      .eq('user_id', invitee.id)
      .single()

    if (existingMember) {
      return NextResponse.json(
        { error: '该用户已在团队中' },
        { status: 409 }
      )
    }

    // 添加成员
    const { data: newMember, error: addError } = await supabase
      .from('team_members')
      .insert({
        team_id: teamId,
        user_id: invitee.id,
        role: role as 'admin' | 'member' | 'viewer',
        weight: Math.min(10, Math.max(1, Number(weight))),
        nickname: nickname || invitee.full_name,
      })
      .select()
      .single()

    if (addError) {
      return NextResponse.json({ error: '添加成员失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      member: {
        ...newMember,
        profile: invitee,
      },
      message: `已成功邀请 ${invitee.full_name || email} 加入团队`,
    })
  } catch (error) {
    console.error('Invite member error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
