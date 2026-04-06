'use client'

import { useState, useRef, useTransition } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import styles from '../auth.module.css'
import { login } from '@/app/actions/auth'

export default function LoginForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email.trim()) {
      setError('请输入邮箱地址')
      emailRef.current?.focus()
      return
    }
    if (!password) {
      setError('请输入密码')
      passwordRef.current?.focus()
      return
    }

    const formData = new FormData()
    formData.set('email', email.trim())
    formData.set('password', password)

    startTransition(async () => {
      const result = await login(formData)
      // If we get here, login failed (Server Action would have redirected on success)
      if (result && 'error' in result) {
        setError(result.error)
      }
    })
  }

  return (
    <div className={styles['auth-layout']}>
      {/* Left Brand Panel */}
      <div className={styles['brand-panel']}>
        <div className={styles['brand-bg']}>
          <div className={`${styles['brand-shape']} ${styles['brand-shape-1']}`} />
          <div className={`${styles['brand-shape']} ${styles['brand-shape-2']}`} />
          <div className={`${styles['brand-shape']} ${styles['brand-shape-3']}`} />
          <div className={styles['brand-grid']} />
        </div>

        <div className={styles['brand-content']}>
          <div className={styles['brand-logo']}>
            <div className={styles['brand-logo-icon']}>
              <svg width="24" height="24" viewBox="0 0 20 20" fill="none">
                <path d="M4 10L8 14L16 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className={styles['brand-logo-text']}>DecideFlow</span>
          </div>

          <h1 className={styles['brand-headline']}>
            让每个决策<br/>
            都有<span>迹可循</span>
          </h1>

          <p className={styles['brand-description']}>
            DecideFlow 是新一代团队决策工具，让投票更透明、决策更科学、执行更高效。
          </p>

          <div className={styles['brand-features']}>
            <div className={styles['brand-feature']}>
              <div className={styles['brand-feature-icon']}>🎯</div>
              <div className={styles['brand-feature-text']}>
                <h4>四种投票机制</h4>
                <p>简单多数 / 加权 / 匿名 / 两轮制</p>
              </div>
            </div>
            <div className={styles['brand-feature']}>
              <div className={styles['brand-feature-icon']}>🤖</div>
              <div className={styles['brand-feature-text']}>
                <h4>AI 决策洞察</h4>
                <p>风险预警 + 历史相似决策分析</p>
              </div>
            </div>
            <div className={styles['brand-feature']}>
              <div className={styles['brand-feature-icon']}>📜</div>
              <div className={styles['brand-feature-text']}>
                <h4>决策留档系统</h4>
                <p>每一个决策都可追溯、可复盘</p>
              </div>
            </div>
          </div>

          <div className={styles['brand-testimonial']}>
            <p className={styles['brand-testimonial-text']}>
              "自从用了 DecideFlow，我们团队开会的时间减少了 40%，决策质量反而更高了。"
            </p>
            <div className={styles['brand-testimonial-author']}>
              <div className={styles['brand-testimonial-avatar']}>陈</div>
              <div>
                <p className={styles['brand-testimonial-name']}>陈明远</p>
                <p className={styles['brand-testimonial-role']}>产品总监，某科技公司</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className={styles['form-panel']}>
        <div className={styles['form-container']}>
          <div className={styles['form-header']}>
            <h2 className={styles['form-title']}>欢迎回来</h2>
            <p className={styles['form-subtitle']}>
              还没有账号？<Link href="/auth/register">立即注册 →</Link>
            </p>
          </div>

          {error && (
            <div className={styles['form-error']}>
              <AlertCircle size={16} className={styles['form-error-icon']} />
              <span className={styles['form-error-text']}>{error}</span>
            </div>
          )}

          {success && (
            <div className={styles['form-success']}>
              <CheckCircle2 size={16} className={styles['form-success-icon']} />
              <span className={styles['form-success-text']}>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className={styles['form-group']}>
              <label className={styles['form-label']} htmlFor="email">
                邮箱地址
              </label>
              <input
                ref={emailRef}
                id="email"
                name="email"
                type="email"
                className={styles['form-input']}
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                disabled={isPending}
                autoFocus
              />
            </div>

            <div className={styles['form-group']}>
              <label className={styles['form-label']} htmlFor="password">
                密码
              </label>
              <div className={styles['form-input-wrapper']}>
                <input
                  ref={passwordRef}
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  className={styles['form-input']}
                  placeholder="输入密码"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  disabled={isPending}
                />
                <button
                  type="button"
                  className={styles['form-input-suffix']}
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={styles['form-submit']}
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <div className={styles['spinner']} />
                  登录中...
                </>
              ) : (
                <>
                  登录
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className={styles['form-footer']}>
            <p className={styles['form-footer-text']}>
              登录即表示你同意我们的{' '}
              <a href="#">服务条款</a> 和{' '}
              <a href="#">隐私政策</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
