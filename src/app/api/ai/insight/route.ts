// @ts-nocheck
import { createClient } from '@/lib/supabase/server'
import { aiService } from '@/lib/ai/service'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

/**
 * POST /api/ai/insight
 * 生成 AI 决策洞察
 *
 * Body:
 * {
 *   type: 'before' | 'after'
 *   decision_id: string
 * }
 */
export async function POST(request: Request) {
  try {
    // 1. 认证
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    // 2. 检查 AI 服务配置
    if (!aiService.isConfigured()) {
      return NextResponse.json(
        {
          error: 'AI 服务未配置',
          hint: '请在 .env.local 中设置 OPENAI_API_KEY',
        },
        { status: 503 }
      )
    }

    // 3. 解析请求
    const { type, decision_id } = await request.json()

    if (!type || !['before', 'after'].includes(type)) {
      return NextResponse.json(
        { error: '缺少 type 参数或 type 无效' },
        { status: 400 }
      )
    }

    // 4. 获取决策信息
    const { data: decision, error: decisionError } = await supabase
      .from('decisions')
      .select('*')
      .eq('id', decision_id)
      .single()

    if (decisionError || !decision) {
      return NextResponse.json({ error: '决策不存在' }, { status: 404 })
    }

    // 5. 验证权限
    const { data: membership } = await supabase
      .from('team_members')
      .select('role')
      .eq('team_id', decision.team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: '无权限访问该决策' }, { status: 403 })
    }

    // 6. 生成洞察
    if (type === 'before') {
      return await generateBeforeInsight(supabase, decision)
    } else {
      return await generateAfterInsight(supabase, decision)
    }
  } catch (error) {
    console.error('AI insight error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

// ──────────────────────────────────────────────
// Before Insight
// ──────────────────────────────────────────────

async function generateBeforeInsight(supabase: any, decision: any) {
  // 获取投票选项
  const { data: options } = await supabase
    .from('options')
    .select('content, description')
    .eq('decision_id', decision.id)
    .order('order_index', { ascending: true })

  // 获取团队历史决策（用于相似分析）
  const { data: teamDecisions } = await supabase
    .from('decisions')
    .select('id, title, description, final_result, created_at')
    .eq('team_id', decision.team_id)
    .eq('status', 'passed')
    .order('created_at', { ascending: false })
    .limit(20)

  // 获取历史决策的执行情况
  const similarDecisions = teamDecisions
    ? await Promise.all(
        (teamDecisions || [])
          .filter((d: any) => d.id !== decision.id)
          .slice(0, 3)
          .map(async (d: any) => {
            const { data: executions } = await supabase
              .from('executions')
              .select('status')
              .eq('decision_id', d.id)

            const completed = executions?.filter((e: any) => e.status === 'completed').length || 0
            const total = executions?.length || 0
            const executionRate = total > 0 ? Math.round((completed / total) * 100) : 0

            return {
              title: d.title,
              outcome: executionRate > 70
                ? '执行效果良好'
                : executionRate > 40
                ? '部分执行，效果一般'
                : '执行率低，建议谨慎',
              lesson: total > 0
                ? `历史执行率：${executionRate}%（${completed}/${total} 项完成）`
                : '尚无执行记录',
            }
          })
      )
    : []

  try {
    const insight = await aiService.generateBeforeInsight({
      decision,
      options: options || [],
      similarDecisions,
    })

    // 将洞察存入 decision.ai_insight
    await supabase
      .from('decisions')
      .update({ ai_insight: { ...(decision.ai_insight || {}), before: insight } })
      .eq('id', decision.id)

    return NextResponse.json({
      success: true,
      type: 'before',
      insight,
      cached: false,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'AI 洞察生成失败',
        type: 'before',
      },
      { status: 500 }
    )
  }
}

// ──────────────────────────────────────────────
// After Insight
// ──────────────────────────────────────────────

async function generateAfterInsight(supabase: any, decision: any) {
  // 获取投票选项和结果
  const { data: options } = await supabase
    .from('options')
    .select('id, content, description')
    .eq('decision_id', decision.id)
    .order('order_index', { ascending: true })

  const { data: votes } = await supabase
    .from('votes')
    .select('option_id, weight')
    .eq('decision_id', decision.id)

  // 获取团队成员总数
  const { count: participantCount } = await supabase
    .from('team_members')
    .select('*', { count: 'exact', head: true })
    .eq('team_id', decision.team_id)

  // 计算各选项得分
  const totalScore = votes?.reduce((sum: number, v: any) => sum + (v.weight || 1), 0) || 0
  const voteResults = (options || []).map((opt: any) => {
    const optVotes = votes?.filter((v: any) => v.option_id === opt.id) || []
    const score = optVotes.reduce((sum: number, v: any) => sum + (v.weight || 1), 0)
    return {
      option: opt.content,
      score,
      percentage: totalScore > 0 ? Math.round((score / totalScore) * 100) : 0,
    }
  })

  // 找出胜出选项
  voteResults.sort((a: any, b: any) => b.score - a.score)
  const winningOption = voteResults[0]?.option || ''
  const totalVotes = votes?.length || 0
  const participants = participantCount || 1
  const turnoutRate = (totalVotes / participants) * 100

  try {
    const insight = await aiService.generateAfterInsight({
      decisionTitle: decision.title,
      voteResults,
      winningOption,
      totalVotes,
      turnoutRate,
      passThreshold: decision.pass_threshold,
      participants,
      voteType: decision.vote_type,
    })

    // 将洞察存入 decision.ai_insight
    await supabase
      .from('decisions')
      .update({ ai_insight: { ...(decision.ai_insight || {}), after: insight } })
      .eq('id', decision.id)

    return NextResponse.json({
      success: true,
      type: 'after',
      insight,
      summary: {
        winning_option: winningOption,
        vote_results: voteResults,
        turnout_rate: turnoutRate.toFixed(0),
      },
      cached: false,
    })
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'AI 洞察生成失败',
        type: 'after',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/ai/insight?decision_id=xxx&type=before|after
 * 获取已缓存的洞察
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const decisionId = searchParams.get('decision_id')
    const type = searchParams.get('type')

    if (!decisionId) {
      return NextResponse.json({ error: '缺少 decision_id' }, { status: 400 })
    }

    const { data: decision } = await supabase
      .from('decisions')
      .select('ai_insight')
      .eq('id', decisionId)
      .single()

    if (!decision) {
      return NextResponse.json({ error: '决策不存在' }, { status: 404 })
    }

    const aiInsight = decision.ai_insight as any || {}

    if (type === 'before') {
      return NextResponse.json({
        success: true,
        insight: aiInsight.before || null,
        cached: !!aiInsight.before,
      })
    } else if (type === 'after') {
      return NextResponse.json({
        success: true,
        insight: aiInsight.after || null,
        cached: !!aiInsight.after,
      })
    }

    return NextResponse.json({
      success: true,
      insight: aiInsight,
      cached: !!aiInsight.before || !!aiInsight.after,
    })
  } catch (error) {
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
