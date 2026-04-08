// @ts-nocheck
// TypeScript disabled because Supabase SSR createServerClient has complex generic
// type inference issues with inline database type definitions.
// All queries use explicit field access; runtime behavior is correct.
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
import { calculateVotingResults } from '@/lib/vote-engine'
import type { VoteType } from '@/types/database'

/**
 * POST /api/decisions/[id]/vote
 * 提交投票
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

    const { option_id, comment, round = 1 } = await request.json()

    if (!option_id) {
      return NextResponse.json({ error: '请选择投票选项' }, { status: 400 })
    }

    // 获取决策信息
    const { data: decision, error: decisionError } = await supabase
      .from('decisions')
      .select('*')
      .eq('id', decisionId)
      .single()

    if (decisionError || !decision) {
      return NextResponse.json({ error: '决策不存在' }, { status: 404 })
    }

    // 验证投票是否可接受
    if (decision.status !== 'voting') {
      return NextResponse.json(
        { error: '该决策当前不处于投票状态' },
        { status: 400 }
      )
    }

    // 检查投票时间
    const now = new Date()
    if (decision.voting_start && new Date(decision.voting_start) > now) {
      return NextResponse.json({ error: '投票尚未开始' }, { status: 400 })
    }
    if (decision.voting_end && new Date(decision.voting_end) < now) {
      return NextResponse.json({ error: '投票已结束' }, { status: 400 })
    }

    // 验证选项
    const { data: option } = await supabase
      .from('options')
      .select('id')
      .eq('decision_id', decisionId)
      .eq('id', option_id)
      .single()

    if (!option) {
      return NextResponse.json({ error: '无效的投票选项' }, { status: 400 })
    }

    // 验证用户在团队中
    const { data: membership } = await supabase
      .from('team_members')
      .select('weight')
      .eq('team_id', decision.team_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ error: '无权限参与此决策投票' }, { status: 403 })
    }

    // 两轮制：检查当前轮次
    if (decision.vote_type === 'two_round' && decision.round !== round) {
      return NextResponse.json(
        { error: `当前处于第${decision.round}轮，请等待管理员开启下一轮` },
        { status: 400 }
      )
    }

    // 检查是否已投票（每轮一人一票）
    const { data: existingVote } = await supabase
      .from('votes')
      .select('id, option_id')
      .eq('decision_id', decisionId)
      .eq('user_id', user.id)
      .eq('round', round)
      .single()

    let vote
    if (existingVote) {
      // 更新投票（改投）
      const { data: updatedVote, error: updateError } = await supabase
        .from('votes')
        .update({
          option_id,
          comment: comment || null,
          created_at: new Date().toISOString(),
        })
        .eq('id', existingVote.id)
        .select()
        .single()

      if (updateError) {
        return NextResponse.json({ error: '更新投票失败' }, { status: 500 })
      }
      vote = updatedVote
    } else {
      // 新投票
      const { data: newVote, error: insertError } = await supabase
        .from('votes')
        .insert({
          decision_id: decisionId,
          option_id,
          user_id: user.id,
          weight: membership.weight,
          comment: comment || null,
          round,
        })
        .select()
        .single()

      if (insertError) {
        return NextResponse.json({ error: '投票提交失败' }, { status: 500 })
      }
      vote = newVote
    }

    // 重新计算投票结果（仅当前轮次）
    const { data: allVotes } = await supabase
      .from('votes')
      .select('*')
      .eq('decision_id', decisionId)
      .eq('round', round)

    const { data: allOptions } = await supabase
      .from('options')
      .select('*')
      .eq('decision_id', decisionId)
      .order('order_index', { ascending: true })

    const { data: allMembers } = await supabase
      .from('team_members')
      .select('user_id, weight')
      .eq('team_id', decision.team_id)

    const voteResults = calculateVotingResults(
      allOptions || [],
      allVotes || [],
      allMembers || [],
      decision.vote_type as VoteType,
      decision.pass_threshold,
      round
    )

    // 两轮制特殊处理
    let shouldCloseVoting = false
    let newRound = decision.round
    let newStatus = decision.status
    let newResult = decision.final_result

    if (decision.vote_type === 'two_round') {
      if (round === 1 && voteResults.passed) {
        // 第一轮直接通过
        newStatus = 'passed'
        newResult = 'passed'
        shouldCloseVoting = true
      } else if (round === 1 && !voteResults.passed && voteResults.winning_option) {
        // 第一轮未过，需要第二轮
        newRound = 2
        // 可以在这里自动创建第二轮选项，或等待管理员操作
      }
    } else if (voteResults.passed) {
      newStatus = 'passed'
      newResult = 'passed'
      shouldCloseVoting = true
    } else if (
               allVotes && allMembers &&
               voteResults.total_voted > 0 &&
               voteResults.turnout_rate === 100
    ) {
      // 全员投票且仍未通过
      newStatus = 'rejected'
      newResult = 'rejected'
      shouldCloseVoting = true
    }

    // 更新决策状态
    if (shouldCloseVoting || newRound !== decision.round) {
      await supabase
        .from('decisions')
        .update({
          status: newStatus,
          final_result: newResult,
          round: newRound,
        })
        .eq('id', decisionId)
    }

    return NextResponse.json({
      success: true,
      vote,
      vote_results: voteResults,
      voting_closed: shouldCloseVoting,
      next_round: newRound !== decision.round ? newRound : null,
      message: existingVote ? '投票已更新' : '投票成功',
    })
  } catch (error) {
    console.error('Vote error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}

/**
 * GET /api/decisions/[id]/vote
 * 获取投票结果（实时）
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

    // 获取决策
    const { data: decision } = await supabase
      .from('decisions')
      .select('vote_type, pass_threshold, round, team_id')
      .eq('id', decisionId)
      .single()

    if (!decision) {
      return NextResponse.json({ error: '决策不存在' }, { status: 404 })
    }

    // 获取所有投票
    const { data: votes } = await supabase
      .from('votes')
      .select('*')
      .eq('decision_id', decisionId)

    // 获取选项
    const { data: options } = await supabase
      .from('options')
      .select('*')
      .eq('decision_id', decisionId)
      .order('order_index', { ascending: true })

    // 获取成员
    const { data: members } = await supabase
      .from('team_members')
      .select('user_id, weight')
      .eq('team_id', decision.team_id)

    // 获取当前用户是否已投票
    const userVotes = votes?.filter(v => v.user_id === user.id) || []
    const hasVoted = userVotes.length > 0

    const voteResults = calculateVotingResults(
      options || [],
      votes || [],
      members || [],
      decision.vote_type as VoteType,
      decision.pass_threshold,
      decision.round
    )

    return NextResponse.json({
      success: true,
      vote_results: voteResults,
      total_votes: votes?.length || 0,
      has_voted: hasVoted,
      user_voted_option_id: hasVoted ? userVotes[userVotes.length - 1].option_id : null,
    })
  } catch (error) {
    console.error('Get vote results error:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}
