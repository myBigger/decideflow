import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '登录 / 注册 — DecideFlow',
  description: '登录或注册 DecideFlow 账号，开始高效团队决策',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  )
}
