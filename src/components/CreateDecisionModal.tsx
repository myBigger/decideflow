'use client'

import { useState } from 'react'
import { X, Plus, Trash2, Calendar, AlertCircle, Loader2 } from 'lucide-react'
import { format, addDays } from 'date-fns'
import type { Decision, VoteType } from '@/types/database'
import { VOTE_RULES } from '@/lib/vote-engine'
import { decisionsAPI } from '@/lib/api/decisions'

interface CreateDecisionModalProps {
  onClose: () => void
  onCreated: (decision: Decision) => void
  teamId: string
}

const VOTE_TYPES: VoteType[] = ['simple', 'weighted', 'anonymous', 'two_round']

export default function CreateDecisionModal({ onClose, onCreated, teamId }: CreateDecisionModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [voteType, setVoteType] = useState<VoteType>('simple')
  const [passThreshold, setPassThreshold] = useState(50)
  const [options, setOptions] = useState<string[]>(['', ''])
  const [votingDays, setVotingDays] = useState(3)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const addOption = () => {
    if (options.length < 10) setOptions([...options, ''])
  }

  const removeOption = (index: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== index))
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = '请输入议题名称'
    if (title.length > 100) newErrors.title = '议题名称不能超过100字'
    const validOptions = options.filter(o => o.trim())
    if (validOptions.length < 2) newErrors.options = '至少需要2个投票选项'
    return newErrors
  }

  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      const result = await decisionsAPI.create({
        team_id: teamId,
        title: title.trim(),
        description: description.trim() || undefined,
        vote_type: voteType,
        pass_threshold: passThreshold,
        voting_days: votingDays,
        options: options.filter(o => o.trim()),
        start_voting: true,
      })

      if (result.success) {
        onCreated(result.decision)
      } else {
        // API 返回 success:false 时显示错误信息
        setErrors({ submit: (result as any).error || '创建失败，请重试' })
      }
    } catch (err: any) {
      setErrors({ submit: err.message || '创建失败，请重试' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const rule = VOTE_RULES[voteType]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in">
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-900">新建决策</h2>
            <p className="text-xs text-slate-400 mt-0.5">发起团队投票，让决策有据可查</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost p-2 -mr-2 rounded-xl">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Basic Info */}
          <div>
            <label className="label">议题名称 *</label>
            <input
              type="text"
              value={title}
              onChange={e => {
                setTitle(e.target.value)
                if (errors.title) setErrors({ ...errors, title: '' })
              }}
              placeholder="例如：Q3 产品优先级排序"
              className={`input ${errors.title ? 'input-error' : ''}`}
              maxLength={100}
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.title}
              </p>
            )}
            <p className="text-xs text-slate-400 mt-1 text-right">{title.length}/100</p>
          </div>

          <div>
            <label className="label">议题说明（可选）</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="补充背景信息、决策约束、参考文档链接等..."
              className="input min-h-[80px] resize-none"
            />
          </div>

          {/* Vote Type */}
          <div>
            <label className="label">投票规则 *</label>
            <div className="grid grid-cols-2 gap-2">
              {VOTE_TYPES.map(type => {
                const r = VOTE_RULES[type]
                const selected = voteType === type
                return (
                  <button
                    key={type}
                    onClick={() => setVoteType(type)}
                    className={`
                      p-3 rounded-xl border-2 text-left transition-all duration-200
                      ${selected
                        ? 'border-primary-400 bg-primary-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{r.icon}</span>
                      <span className={`text-sm font-semibold ${selected ? 'text-primary-700' : 'text-slate-700'}`}>
                        {r.label}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed ${selected ? 'text-primary-600' : 'text-slate-400'}`}>
                      {r.description}
                    </p>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-primary-600 mt-2 bg-primary-50 rounded-lg px-3 py-2">
              💡 适用场景：{rule.bestFor}
            </p>
          </div>

          {/* Threshold (except two_round) */}
          {voteType !== 'two_round' && (
            <div>
              <label className="label">通过阈值</label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={30}
                  max={100}
                  step={5}
                  value={passThreshold}
                  onChange={e => setPassThreshold(Number(e.target.value))}
                  className="flex-1 accent-primary-500"
                />
                <span className="text-sm font-bold text-primary-600 w-16 text-center">{passThreshold}%</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {voteType === 'weighted' ? '加权得票率超过此阈值即通过' : '得票率超过此阈值即通过'}
              </p>
            </div>
          )}

          {/* Voting Duration */}
          <div>
            <label className="label">投票时长</label>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-sm text-slate-600">
                {format(new Date(), 'yyyy/MM/dd HH:mm')} 开始
              </span>
              <span className="text-slate-300">→</span>
              <span className="text-sm text-slate-600">
                {format(addDays(new Date(), votingDays), 'yyyy/MM/dd HH:mm')} 结束
              </span>
            </div>
            <div className="flex gap-2 mt-2">
              {[1, 3, 5, 7].map(d => (
                <button
                  key={d}
                  onClick={() => setVotingDays(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    votingDays === d
                      ? 'bg-primary-100 text-primary-700'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {d}天
                </button>
              ))}
            </div>
          </div>

          {/* Options */}
          <div>
            <label className="label">投票选项 *</label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 shrink-0">
                    {idx + 1}
                  </div>
                  <input
                    type="text"
                    value={opt}
                    onChange={e => updateOption(idx, e.target.value)}
                    placeholder={`选项 ${idx + 1}`}
                    className="input flex-1"
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(idx)}
                      className="btn btn-ghost p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {errors.options && (
              <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                <AlertCircle size={12} />
                {errors.options}
              </p>
            )}
            {options.length < 10 && (
              <button
                onClick={addOption}
                className="btn btn-ghost text-sm mt-2 w-full border border-dashed border-slate-300"
              >
                <Plus size={14} />
                添加选项
              </button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-5">
          {errors.submit && (
            <div className="flex items-center gap-2 text-xs text-red-500 mb-3 px-1">
              <AlertCircle size={12} />
              {errors.submit}
            </div>
          )}
          <div className="flex items-center justify-end gap-3">
            <button onClick={onClose} disabled={isSubmitting} className="btn btn-secondary">
              取消
            </button>
            <button onClick={handleSubmit} disabled={isSubmitting} className="btn btn-primary shadow-lg shadow-primary-500/20">
              {isSubmitting ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  创建中...
                </>
              ) : (
                '发起投票'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
