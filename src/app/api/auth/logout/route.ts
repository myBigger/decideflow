// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * POST /api/auth/logout
 * 用户登出
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return NextResponse.json(
        { error: '登出失败' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '已安全登出',
    })
  } catch (error) {
    console.error('Logout error:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}
