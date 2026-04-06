/**
 * AI Insight Service
 *
 * 基于 OpenAI GPT-4o 为 Dec ideFlow 生成智能决策洞察
 *
 * 核心能力：
 * 1. 投票前洞察 — 分析历史相似决策，预警潜在风险
 * 2. 投票后洞察 — 生成执行建议，风险清单，复盘计划
 */

import type { AIInsight, Decision, Vote } from '@/types/database'

// ──────────────────────────────────────────────
// Prompt Templates
// ──────────────────────────────────────────────

const SYSTEM_PROMPT = `你是一位经验丰富的企业决策顾问，帮助团队做出更好的决策。

你的职责：
1. 分析决策的背景和历史相似案例
2. 识别潜在风险和被忽视的因素
3. 提供建设性的执行建议
4. 保持客观、专业、直接的风格

重要原则：
- 不要泛泛而谈，要给出具体、可操作的建议
- 识别可能翻案的风险点
- 尊重团队自主决策权，你的建议仅供参考
- 语言简洁有力，避免废话

输出格式为 JSON，结构清晰。`

/**
 * 构建投票前洞察的 prompt
 */
function buildBeforeInsightPrompt(params: {
  decisionTitle: string
  decisionDescription: string | null
  voteType: string
  options: Array<{ content: string; description: string | null }>
  similarDecisions?: Array<{
    title: string
    outcome: string
    lesson: string
  }>
  teamDecisionHistory?: Decision[]
}): string {
  const { decisionTitle, decisionDescription, voteType, options, similarDecisions } = params

  const optionsText = options.map((o, i) => `选项${i + 1}: ${o.content}${o.description ? `（${o.description}）` : ''}`).join('\n')

  let context = ''
  if (similarDecisions && similarDecisions.length > 0) {
    context += `\n\n历史相似决策参考：\n${similarDecisions.map(d => `- ${d.title}: ${d.outcome}。教训：${d.lesson}`).join('\n')}`
  }

  return `请分析以下正在发起的决策，提供投票前洞察：\n\n` +
    `【决策标题】${decisionTitle}\n` +
    `【决策描述】${decisionDescription || '无'}\n` +
    `【投票规则】${voteType}\n` +
    `【投票选项】\n${optionsText}\n` +
    context +
    `\n\n请输出 JSON：\n` +
    JSON.stringify({
      warnings: 'array[string] — 最多3条最重要的风险预警，要具体',
      suggestions: 'array[string] — 最多3条建议，补充可能被忽视的考量因素',
      similar_decisions: 'array[object] — 历史上可能有参考价值的类似决策（最多2条），格式：{title, outcome, lesson}',
    }, null, 2)
}

/**
 * 构建投票后洞察的 prompt
 */
function buildAfterInsightPrompt(params: {
  decisionTitle: string
  winningOption: string
  voteResults: Array<{ option: string; score: number; percentage: number }>
  totalVotes: number
  turnoutRate: number
  passThreshold: number
  participants: number
  voteType: string
}): string {
  const { decisionTitle, winningOption, voteResults, totalVotes, turnoutRate, passThreshold, participants, voteType } = params

  const resultsText = voteResults.map(r => `- ${r.option}: ${r.score}票 (${r.percentage}%)`).join('\n')

  return `决策已完成，请生成投票后洞察：\n\n` +
    `【决策标题】${decisionTitle}\n` +
    `【胜出选项】${winningOption}\n` +
    `【投票规则】${voteType}（通过阈值：${passThreshold}%）\n` +
    `【投票结果】\n${resultsText}\n` +
    `【参与情况】${totalVotes}人投票 / ${participants}人总成员（参与率：${turnoutRate.toFixed(0)}%）\n` +
    `\n请输出 JSON：\n` +
    JSON.stringify({
      summary: 'string — 50字以内的决策总结',
      execution_priorities: 'array[string] — 按优先级排列的3-5个执行要点',
      risk_factors: 'array[string] — 决策执行过程中需要特别关注的风险',
      next_review_date: 'string — 建议的下次复盘日期（格式：YYYY-MM-DD，决策通过后1-3个月）',
    }, null, 2)
}

/**
 * 构建综合对比分析 prompt（用于两轮制）
 */
function buildComparisonPrompt(params: {
  decisionTitle: string
  options: Array<{ content: string; description: string | null; score: number; percentage: number }>
}): string {
  const { decisionTitle, options } = params

  const comparisonText = options.map(o =>
    `- ${o.content}${o.description ? `（${o.description}）` : ''}: ${o.percentage}%`
  ).join('\n')

  return `请对以下决策选项进行对比分析：\n\n` +
    `【决策标题】${decisionTitle}\n` +
    `【各选项当前支持率】\n${comparisonText}\n\n` +
    `请输出 JSON：\n` +
    JSON.stringify({
      analysis: 'string — 对各选项优劣的对比分析，50字以内',
      recommendations: 'array[string] — 给投票人的建议，最多2条',
    }, null, 2)
}

// ──────────────────────────────────────────────
// AI Service
// ──────────────────────────────────────────────

export interface AIActivity {
  type: 'before' | 'after' | 'comparison'
  status: 'generating' | 'success' | 'error'
  startedAt: string
  completedAt?: string
  error?: string
}

export class AIService {
  private apiKey: string
  private model: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || ''
    this.model = 'gpt-4o' // 最新的 GPT-4o，性价比最高
  }

  /**
   * 检查 API 是否可用
   */
  isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.startsWith('sk-')
  }

  /**
   * 通用调用 OpenAI API
   */
  async complete(prompt: string, systemPrompt: string = SYSTEM_PROMPT): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API 未配置，请设置 OPENAI_API_KEY 环境变量')
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature: 0.3, // 较低随机性，保证洞察一致性
        max_tokens: 1500,
        response_format: { type: 'json_object' }, // 强制 JSON 输出
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(`OpenAI API 错误: ${response.status} — ${errorData.error?.message || '未知错误'}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || '{}'
  }

  /**
   * 生成投票前洞察
   */
  async generateBeforeInsight(params: {
    decision: Decision
    options: Array<{ content: string; description: string | null }>
    similarDecisions?: Array<{ title: string; outcome: string; lesson: string }>
  }): Promise<AIInsight['before']> {
    const prompt = buildBeforeInsightPrompt({
      decisionTitle: params.decision.title,
      decisionDescription: params.decision.description,
      voteType: params.decision.vote_type,
      options: params.options,
      similarDecisions: params.similarDecisions,
    })

    const raw = await this.complete(prompt)

    try {
      const parsed = JSON.parse(raw)
      return {
        warnings: Array.isArray(parsed.warnings) ? parsed.warnings.slice(0, 3) : [],
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.slice(0, 3) : [],
        similar_decisions: Array.isArray(parsed.similar_decisions)
          ? parsed.similar_decisions.slice(0, 2).map((d: any) => ({
              id: `similar-${Date.now()}`,
              title: d.title || '',
              outcome: d.outcome || '',
              lesson: d.lesson || '',
            }))
          : [],
      }
    } catch {
      // JSON 解析失败，尝试降级
      return {
        warnings: ['AI 洞察生成格式异常，建议手动补充'],
        suggestions: [],
        similar_decisions: [],
      }
    }
  }

  /**
   * 生成投票后洞察
   */
  async generateAfterInsight(params: {
    decisionTitle: string
    voteResults: Array<{ option: string; score: number; percentage: number }>
    winningOption: string
    totalVotes: number
    turnoutRate: number
    passThreshold: number
    participants: number
    voteType: string
  }): Promise<AIInsight['after']> {
    const prompt = buildAfterInsightPrompt(params)

    const raw = await this.complete(prompt)

    try {
      const parsed = JSON.parse(raw)

      // 验证并规范化日期
      let nextReviewDate = '2026-07-01'
      if (parsed.next_review_date) {
        const dateRegex = /(\d{4}[-/]\d{2}[-/]\d{2})/
        const match = String(parsed.next_review_date).match(dateRegex)
        if (match) {
          nextReviewDate = match[1].replace(/\//g, '-')
        }
      }

      return {
        summary: String(parsed.summary || '决策已通过，建议按计划执行').substring(0, 200),
        execution_priorities: Array.isArray(parsed.execution_priorities)
          ? parsed.execution_priorities.slice(0, 5)
          : [],
        risk_factors: Array.isArray(parsed.risk_factors)
          ? parsed.risk_factors.slice(0, 5)
          : [],
        next_review_date: nextReviewDate,
      }
    } catch {
      return {
        summary: '决策已通过，建议按计划推进执行',
        execution_priorities: [],
        risk_factors: [],
        next_review_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      }
    }
  }

  /**
   * 生成选项对比分析
   */
  async generateComparison(params: {
    decisionTitle: string
    options: Array<{ content: string; description: string | null; score: number; percentage: number }>
  }): Promise<{ analysis: string; recommendations: string[] }> {
    const prompt = buildComparisonPrompt(params)
    const raw = await this.complete(prompt)

    try {
      const parsed = JSON.parse(raw)
      return {
        analysis: String(parsed.analysis || '').substring(0, 200),
        recommendations: Array.isArray(parsed.recommendations)
          ? parsed.recommendations.slice(0, 2)
          : [],
      }
    } catch {
      return { analysis: '', recommendations: [] }
    }
  }
}

// 单例导出
export const aiService = new AIService()
