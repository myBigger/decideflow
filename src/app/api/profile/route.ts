import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/profile
 * 获取当前用户档案
 */
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      profile,
    })
  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

/**
 * PATCH /api/profile
 * 更新当前用户档案
 */
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { full_name, avatar_url } = await request.json()

    const updates: Record<string, any> = {}
    if (full_name !== undefined) updates.full_name = full_name.trim()
    if (avatar_url !== undefined) updates.avatar_url = avatar_url

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: '没有需要更新的字段' }, { status: 400 })
    }

    const { data: profile, error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: '更新档案失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      profile,
      message: '档案已更新',
    })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
