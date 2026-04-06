'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { ArrowRight, CheckCircle2, BarChart2, Zap, Shield } from 'lucide-react'

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/dashboard')
    }
  }, [isLoading, isAuthenticated, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isAuthenticated) return null

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-sm shadow-primary-500/30">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M4 10L8 14L16 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-lg font-bold text-slate-900">DecideFlow</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="btn btn-ghost text-sm">登录</Link>
            <Link href="/auth/register" className="btn btn-primary text-sm shadow-sm shadow-primary-500/25">免费开始</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-36 pb-24 px-6 text-center bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-sm font-medium mb-6">
            <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
            新一代团队决策工具
          </div>

          <h1 className="text-5xl font-extrabold text-slate-900 tracking-tight mb-6 leading-tight">
            让每一个决策
            <br />
            <span className="bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent">
              有迹可循，有据可查
            </span>
          </h1>

          <p className="text-lg text-slate-500 mb-10 max-w-xl mx-auto leading-relaxed">
            Dec ideFlow 是专为现代团队打造的决策管理平台——四种投票机制、AI 智能洞察、完整决策留档，让团队决策更透明、更高效。
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/auth/register" className="btn btn-primary btn-lg shadow-lg shadow-primary-500/25">
              免费开始 <ArrowRight size={18} />
            </Link>
            <Link href="/auth/login" className="btn btn-secondary btn-lg">查看演示</Link>
          </div>

          {/* Mock Preview */}
          <div className="max-w-4xl mx-auto mt-20">
            <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/80 border border-slate-200 overflow-hidden">
              <div className="bg-slate-800 px-4 py-3 flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
                <div className="flex-1 text-center text-xs text-slate-400">DecideFlow — Q3 产品优先级排序</div>
              </div>
              <div className="p-6 bg-slate-50">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { name: 'AI 写作助手', pct: 62, votes: 4, leader: true },
                    { name: '数据仪表盘', pct: 44, votes: 3, leader: false },
                    { name: '移动端优化', pct: 26, votes: 2, leader: false },
                  ].map((item, i) => (
                    <div key={i} className={`bg-white rounded-xl p-4 border ${item.leader ? 'border-primary-300 ring-2 ring-primary-100' : 'border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-semibold text-slate-800">{item.name}</span>
                        {item.leader && <span className="text-xs text-primary-600 font-medium">领先</span>}
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-primary-400 to-primary-600 rounded-full" style={{ width: `${item.pct}%` }} />
                      </div>
                      <div className="flex justify-between mt-2 text-xs text-slate-400">
                        <span>{item.pct}%</span>
                        <span>{item.votes}票</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">为高效决策而设计</h2>
            <p className="text-slate-500 max-w-lg mx-auto">从投票到执行，DecideFlow 覆盖决策全生命周期</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <BarChart2 size={24} />,
                color: 'bg-primary-50 text-primary-600',
                title: '四种投票机制',
                desc: '简单多数、加权投票、匿名投票、两轮制——适用于不同场景的决策规则',
              },
              {
                icon: <Zap size={24} />,
                color: 'bg-amber-50 text-amber-600',
                title: 'AI 决策洞察',
                desc: '基于历史数据自动分析风险、预警问题、推荐执行方案',
              },
              {
                icon: <Shield size={24} />,
                color: 'bg-green-50 text-green-600',
                title: '完整决策留档',
                desc: '每个决策从发起到执行全程记录，永久可追溯，防翻案',
              },
            ].map((f, i) => (
              <div key={i} className="card p-6 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>{f.icon}</div>
                <h3 className="text-base font-bold text-slate-900 mb-2">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="max-w-2xl mx-auto text-center text-white">
          <h2 className="text-3xl font-bold mb-4">准备好提升团队决策质量了吗？</h2>
          <p className="text-slate-400 mb-8">小团队永久免费，无需信用卡，立即开始</p>
          <Link href="/auth/register" className="inline-flex items-center gap-2 px-8 py-4 bg-primary-500 text-white font-semibold rounded-xl hover:bg-primary-600 transition-colors shadow-lg shadow-primary-500/30">
            免费开始 <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-200">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
                <path d="M4 10L8 14L16 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-700">Dec ideFlow</span>
          </div>
          <p className="text-xs text-slate-400">© 2026 Dec ideFlow. 保留所有权利。</p>
        </div>
      </footer>
    </div>
  )
}
