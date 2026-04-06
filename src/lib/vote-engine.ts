/**
 * Vote Engine — 核心投票计算逻辑
 *
 * 支持四种投票机制：
 * 1. 简单多数 (Simple Majority)
 * 2. 加权投票 (Weighted Voting)
 * 3. 匿名投票 (Anonymous)
 * 4. 两轮制 (Two-Round)
 */

import type { Option, Vote, TeamMember, VoteType } from '@/types/database'

export interface VoteResult {
  option_id: string
  content: string
  score: number
  percentage: number
  voter_count: number
}

export interface VotingStats {
  total_eligible: number
  total_voted: number
  turnout_rate: number
  results: VoteResult[]
  passed: boolean
  winning_option?: VoteResult
  round?: number
}

export interface MemberVoteMap {
  [user_id: string]: {
    option_id: string
    weight: number
    comment: string | null
  }
}

/**
 * 计算投票结果
 */
export function calculateVotingResults(
  options: Option[],
  votes: Vote[],
  members: TeamMember[],
  voteType: VoteType,
  passThreshold: number = 50,
  round: number = 1
): VotingStats {
  const totalEligible = members.length

  // 为每个成员建立权重映射
  const memberWeightMap: { [user_id: string]: number } = {}
  members.forEach(m => {
    memberWeightMap[m.user_id] = m.weight || 1
  })

  // 将投票按用户分组（每用户一票，取最新）
  // 两轮制：只统计当前轮次的投票
  const latestVotesByUser: MemberVoteMap = {}
  votes.forEach(vote => {
    // 过滤：只取当前轮次的投票（simple/weighted/anonymous 默认 round=1）
    if ('round' in vote && vote.round !== round) return

    if (!latestVotesByUser[vote.user_id]) {
      latestVotesByUser[vote.user_id] = {
        option_id: vote.option_id,
        weight: memberWeightMap[vote.user_id] || 1,
        comment: vote.comment,
      }
    }
  })

  const totalVoted = Object.keys(latestVotesByUser).length
  const turnoutRate = totalEligible > 0 ? (totalVoted / totalEligible) * 100 : 0

  // 计算每个选项的得分
  const results: VoteResult[] = options.map(option => {
    let score = 0
    let voterCount = 0

    Object.values(latestVotesByUser).forEach(vote => {
      if (vote.option_id === option.id) {
        if (voteType === 'weighted') {
          score += vote.weight
        } else {
          score += 1
        }
        voterCount++
      }
    })

    return {
      option_id: option.id,
      content: option.content,
      score,
      percentage: 0, // 稍后计算
      voter_count: voterCount,
    }
  })

  // 计算百分比
  const totalScore = results.reduce((sum, r) => sum + r.score, 0)
  results.forEach(r => {
    r.percentage = totalScore > 0 ? (r.score / totalScore) * 100 : 0
  })

  // 按得分排序
  results.sort((a, b) => b.score - a.score)

  const winningOption = results[0]
  const winningPercentage = winningOption.percentage

  let passed = false
  if (totalVoted === 0) {
    passed = false
  } else if (voteType === 'two_round' && round === 1) {
    // 两轮制第一轮：使用 passThreshold（含50%）直接通过，否则进入第二轮
    passed = winningPercentage >= passThreshold
  } else {
    // 其他情况：超过阈值即通过
    passed = winningPercentage >= passThreshold
  }

  return {
    total_eligible: totalEligible,
    total_voted: totalVoted,
    turnout_rate: turnoutRate,
    results,
    passed,
    winning_option: winningOption,
    round,
  }
}

/**
 * 投票规则说明
 */
export const VOTE_RULES: Record<VoteType, {
  label: string
  description: string
  icon: string
  bestFor: string
}> = {
  simple: {
    label: '简单多数',
    description: '1人1票，得票率超过阈值的选项即通过',
    icon: '✓',
    bestFor: '日常事项、团队偏好选择',
  },
  weighted: {
    label: '加权投票',
    description: '按职级/贡献分配权重，权重高者话语权更大',
    icon: '⚖',
    bestFor: '战略决策、股权相关、预算分配',
  },
  anonymous: {
    label: '匿名投票',
    description: '投票人身份完全隐藏，消除权力压制',
    icon: '🎭',
    bestFor: '人事决策、绩效评估、敏感议题',
  },
  two_round: {
    label: '两轮制',
    description: '第一轮海选前两名进入决赛轮，超50%即通过',
    icon: '⟳',
    bestFor: '方案竞标、职位竞选、多中选最优',
  },
}

/**
 * 判断投票是否已结束
 */
export function isVotingEnded(votingEnd: string | null): boolean {
  if (!votingEnd) return false
  return new Date(votingEnd) < new Date()
}

/**
 * 判断投票是否已开始
 */
export function isVotingStarted(votingStart: string | null): boolean {
  if (!votingStart) return true // 未设定则默认已开始
  return new Date(votingStart) <= new Date()
}

/**
 * 判断当前用户是否已投票
 */
export function hasUserVoted(
  userId: string,
  votes: Vote[],
  decisionId: string
): string | null {
  const userVotes = votes
    .filter(v => v.user_id === userId && v.decision_id === decisionId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  return userVotes.length > 0 ? userVotes[0].option_id : null
}
