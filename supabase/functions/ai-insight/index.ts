// Dec ideFlow — AI Insight Edge Function
// Deploy to Supabase Edge Functions for better performance
// Run: supabase functions deploy ai-insight

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SYSTEM_PROMPT = `你是一位经验丰富的企业决策顾问，帮助团队做出更好的决策。
你的职责：分析决策背景、识别风险、提供建议。
保持客观专业，直接给出具体可操作的建议。
输出格式为 JSON。`

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: '未登录' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: '未登录' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { type, decision_id } = await req.json()

    if (!type || !['before', 'after'].includes(type)) {
      return new Response(JSON.stringify({ error: '无效的 type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!decision_id) {
      return new Response(JSON.stringify({ error: '缺少 decision_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Get decision
    const { data: decision, error: decisionError } = await supabaseClient
      .from('decisions')
      .select('*')
      .eq('id', decision_id)
      .single()

    if (decisionError || !decision) {
      return new Response(JSON.stringify({ error: '决策不存在' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify membership
    const { data: membership } = await supabaseClient
      .from('team_members')
      .select('role')
      .eq('team_id', decision.team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return new Response(JSON.stringify({ error: '无权限' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Call OpenAI
    const apiKey = Deno.env.get('OPENAI_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'AI 未配置' }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let prompt = ''
    let insightKey = ''

    if (type === 'before') {
      const { data: options } = await supabaseClient
        .from('options')
        .select('content, description')
        .eq('decision_id', decision_id)

      prompt = `分析以下正在发起的决策，提供投票前洞察：

【决策标题】${decision.title}
【决策描述】${decision.description || '无'}
【投票规则】${decision.vote_type}
【投票选项】\n${(options || []).map((o, i) => `选项${i + 1}: ${o.content}${o.description ? `（${o.description}）` : ''}`).join('\n')}

输出 JSON：
{"warnings": ["风险1", "风险2", "风险3"], "suggestions": ["建议1", "建议2", "建议3"], "similar_decisions": [{"title": "标题", "outcome": "结果", "lesson": "教训"}]}`
      insightKey = 'before'
    } else {
      const { data: options } = await supabaseClient
        .from('options')
        .select('id, content')
        .eq('decision_id', decision_id)

      const { data: votes } = await supabaseClient
        .from('votes')
        .select('option_id, weight')
        .eq('decision_id', decision_id)

      const { count: participantCount } = await supabaseClient
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', decision.team_id)

      const voteResults = (options || []).map((opt: any) => {
        const optVotes = (votes || []).filter((v: any) => v.option_id === opt.id)
        const score = optVotes.reduce((sum: number, v: any) => sum + (v.weight || 1), 0)
        const totalScore = (votes || []).reduce((sum: number, v: any) => sum + (v.weight || 1), 0)
        return {
          option: opt.content,
          score,
          percentage: totalScore > 0 ? Math.round((score / totalScore) * 100) : 0,
        }
      })

      voteResults.sort((a, b) => b.score - a.score)
      const participants = participantCount || 1
      const turnoutRate = ((votes?.length || 0) / participants) * 100

      prompt = `决策已完成，生成投票后洞察：

【决策标题】${decision.title}
【胜出选项】${voteResults[0]?.option || '无'}
【投票规则】${decision.vote_type}（通过阈值：${decision.pass_threshold}%）
【投票结果】\n${voteResults.map(r => `- ${r.option}: ${r.score}票 (${r.percentage}%)`).join('\n')}
【参与率】${turnoutRate.toFixed(0)}%（${votes?.length || 0}/${participants}人）

输出 JSON：
{"summary": "50字以内的总结", "execution_priorities": ["优先级1", "优先级2", "优先级3"], "risk_factors": ["风险1", "风险2"], "next_review_date": "YYYY-MM-DD格式的建议复盘日期"}`
      insightKey = 'after'
    }

    // OpenAI request
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    })

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.json().catch(() => ({}))
      return new Response(JSON.stringify({
        success: false,
        error: `OpenAI 错误: ${errorData.error?.message || openAIResponse.statusText}`
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const data = await openAIResponse.json()
    const raw = data.choices[0]?.message?.content || '{}'

    let parsed: any = {}
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = {}
    }

    // Normalize date
    if (parsed.next_review_date) {
      const match = String(parsed.next_review_date).match(/(\d{4}[-/]\d{2}[-/]\d{2})/)
      if (match) parsed.next_review_date = match[1].replace(/\//g, '-')
    }

    // Update decision with insight
    const currentInsight = (decision.ai_insight as any) || {}
    await supabaseClient
      .from('decisions')
      .update({ ai_insight: { ...currentInsight, [insightKey]: parsed } })
      .eq('id', decision_id)

    return new Response(JSON.stringify({
      success: true,
      type,
      insight: parsed,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
