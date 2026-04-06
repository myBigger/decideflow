'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight, Check } from 'lucide-react'
import styles from '../auth.module.css'
import { useAuth } from '@/contexts/AuthContext'

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)

  // Focus first empty field on mount
  useEffect(() => {
    if (!fullName) nameRef.current?.focus()
    else if (!email) emailRef.current?.focus()
    else passwordRef.current?.focus()
  }, [])

  // Password strength checker
  const getPasswordStrength = (pwd: string): {
    score: number
    label: string
    color: string
  } => {
    if (!pwd) return { score: 0, label: '', color: '' }
    let score = 0
    if (pwd.length >= 6) score++
    if (pwd.length >= 10) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++

    if (score <= 1) return { score, label: '弱', color: '#ef4444' }
    if (score <= 2) return { score, label: '中等', color: '#f59e0b' }
    if (score <= 3) return { score, label: '良好', color: '#0ea5e9' }
    return { score, label: '强', color: '#22c55e' }
  }

  const strength = getPasswordStrength(password)

  // Validation
  const validate = (): string | null => {
    if (!fullName.trim()) return '请输入你的姓名'
    if (fullName.trim().length < 2) return '姓名至少需要2个字符'
    if (!email.trim()) return '请输入邮箱地址'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return '请输入有效的邮箱地址'
    if (!password) return '请输入密码'
    if (password.length < 6) return '密码至少需要6个字符'
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      // Focus appropriate field
      if (!fullName.trim()) nameRef.current?.focus()
      else if (!email.trim()) emailRef.current?.focus()
      else passwordRef.current?.focus()
      return
    }

    setError(null)
    setSuccess(null)
    setIsLoading(true)

    const result = await register(email.trim(), password, fullName.trim())

    setIsLoading(false)

    if (result.success) {
      setSuccess(result.message || '注册成功！请查收验证邮件')
      // 跳转到登录页
      setTimeout(() => {
        router.push('/auth/login?registered=true')
      }, 1500)
    } else {
      setError(result.error || '注册失败，请稍后重试')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit(e as any)
    }
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
            加入 Dec ideFlow<br/>
            让团队决策<span>更聪明</span>
          </h1>

          <p className={styles['brand-description']}>
            3步开启高效决策之旅——注册账号、创建团队、发起第一个投票。
          </p>

          <div className={styles['brand-features']}>
            <div className={styles['brand-feature']}>
              <div className={styles['brand-feature-icon']}>⚡</div>
              <div className={styles['brand-feature-text']}>
                <h4>30秒完成注册</h4>
                <p>无需手机号，只需邮箱即可开始</p>
              </div>
            </div>
            <div className={styles['brand-feature']}>
              <div className={styles['brand-feature-icon']}>🆓</div>
              <div className={styles['brand-feature-text']}>
                <h4>永久免费计划</h4>
                <p>小团队永久免费，不限决策数量</p>
              </div>
            </div>
            <div className={styles['brand-feature']}>
              <div className={styles['brand-feature-icon']}>🔒</div>
              <div className={styles['brand-feature-text']}>
                <h4>数据完全私有</h4>
                <p>所有数据加密存储，你拥有完全控制权</p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className={styles['brand-testimonial']}>
            <div style={{ display: 'flex', gap: '24px' }}>
              <div>
                <p style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: 0 }}>2,400+</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>活跃团队</p>
              </div>
              <div>
                <p style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: 0 }}>15,000+</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>决策记录</p>
              </div>
              <div>
                <p style={{ fontSize: '28px', fontWeight: 700, color: 'white', margin: 0 }}>99.9%</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: '4px 0 0' }}>服务可用性</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className={styles['form-panel']}>
        <div className={styles['form-container']}>
          <div className={styles['form-header']}>
            <h2 className={styles['form-title']}>创建账号</h2>
            <p className={styles['form-subtitle']}>
              已有账号？<Link href="/auth/login">直接登录 →</Link>
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles['form-error']}>
              <AlertCircle size={16} className={styles['form-error-icon']} />
              <span className={styles['form-error-text']}>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className={styles['form-success']}>
              <CheckCircle2 size={16} className={styles['form-success-icon']} />
              <span className={styles['form-success-text']}>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Full Name */}
            <div className={styles['form-group']}>
              <label className={styles['form-label']} htmlFor="fullName">
                姓名
              </label>
              <input
                ref={nameRef}
                id="fullName"
                type="text"
                className={styles['form-input']}
                placeholder="你的姓名"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                autoComplete="name"
              />
            </div>

            {/* Email */}
            <div className={styles['form-group']}>
              <label className={styles['form-label']} htmlFor="email">
                邮箱地址
              </label>
              <input
                ref={emailRef}
                id="email"
                type="email"
                className={styles['form-input']}
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className={styles['form-group']}>
              <label className={styles['form-label']} htmlFor="password">
                密码
              </label>
              <div className={styles['form-input-wrapper']}>
                <input
                  ref={passwordRef}
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className={styles['form-input']}
                  placeholder="至少6个字符"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoading}
                  autoComplete="new-password"
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

              {/* Password Strength Indicator */}
              {password && (
                <div style={{ marginTop: '8px' }}>
                  <div style={{
                    display: 'flex',
                    gap: '4px',
                    marginBottom: '4px'
                  }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div
                        key={i}
                        style={{
                          flex: 1,
                          height: '3px',
                          borderRadius: '2px',
                          background: i <= strength.score
                            ? strength.color
                            : '#e2e8f0',
                          transition: 'background 0.3s ease',
                        }}
                      />
                    ))}
                  </div>
                  <p style={{
                    fontSize: '11px',
                    color: password ? strength.color : '#94a3b8',
                    fontWeight: 500,
                    margin: 0,
                  }}>
                    密码强度：{strength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              className={styles['form-submit']}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className={styles['spinner']} />
                  注册中...
                </>
              ) : (
                <>
                  创建账号
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
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
