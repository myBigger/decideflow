# 🚀 Dec ideFlow 部署指南

> 本指南将帮助你把 DecideFlow 从本地开发环境部署到 Vercel 生产环境，并连接 Supabase 数据库。

---

## 📋 部署前准备清单

在开始之前，请确保你已准备好：

- [ ] **Supabase 账号** — https://supabase.com
- [ ] **Vercel 账号** — https://vercel.com
- [ ] **OpenAI API Key** — https://platform.openai.com (可选，AI 功能必需)
- [ ] **GitHub 仓库** — 代码需上传至 GitHub

---

## Step 1: 配置 Supabase

### 1.1 创建 Supabase 项目

1. 访问 [supabase.com](https://supabase.com) 并登录
2. 点击 **New Project**
3. 填写项目信息：
   - **Name**: `decideflow`
   - **Database Region**: 选择离你最近的区域
   - **Pricing**: Free 计划足够

### 1.2 获取 API 凭证

1. 进入项目 → **Settings** → **API**
2. 复制以下信息：

```
Project URL:     https://xxxxxxxx.supabase.co
anon/public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 1.3 运行数据库迁移

1. 进入 **SQL Editor**
2. 复制 `supabase/schema.sql` 的全部内容
3. 粘贴并点击 **Run**
4. 等待执行完成（应该看到 ✅ success）

### 1.4 配置身份验证设置

1. 进入 **Authentication** → **Settings**
2. **Site URL**: `https://your-app.vercel.app` (后续填入)
3. **Redirect URLs**: 添加以下 URL
   ```
   https://your-app.vercel.app
   https://your-app.vercel.app/auth/callback
   http://localhost:3000
   ```
4. 点击 **Save**

---

## Step 2: 配置 Vercel

### 2.1 安装 Vercel CLI

```bash
npm i -g vercel
```

### 2.2 部署命令（推荐方式）

**方式 A：Vercel Dashboard（推荐新手）**

1. 访问 [vercel.com](https://vercel.com)
2. 点击 **Add New...** → **Project**
3. 导入你的 GitHub 仓库
4. 配置环境变量（见 2.3）
5. 点击 **Deploy**

**方式 B：Vercel CLI**

```bash
cd ~/projects/decideflow

# 登录 Vercel
vercel login

# 首次部署（预览）
vercel

# 生产部署
vercel --prod
```

### 2.3 配置环境变量

在 Vercel Dashboard → 你的项目 → **Settings** → **Environment Variables** 添加：

| 变量名 | 值 | 运行环境 |
|--------|-----|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...` (anon key) | Production, Preview, Development |
| `OPENAI_API_KEY` | `sk-...` | Production, Preview |

### 2.4 配置 GitHub Secrets（CI/CD 自动部署）

在 GitHub 仓库 → **Settings** → **Secrets and variables** → **Actions** 添加：

| Secret 名称 | 对应值 |
|------------|--------|
| `VERCEL_TOKEN` | Vercel 个人访问令牌 |
| `VERCEL_ORG_ID` | Vercel Organization ID |
| `VERCEL_PROJECT_ID` | Vercel Project ID |
| `SUPABASE_PROJECT_REF` | Supabase 项目 ID |
| `SUPABASE_ACCESS_TOKEN` | Supabase 个人访问令牌 |
| `SUPABASE_DB_PASSWORD` | Supabase 数据库密码 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |
| `OPENAI_API_KEY` | OpenAI API Key |

**获取 Vercel 凭证：**
```bash
# Vercel Token
# https://vercel.com/account/tokens → Create Token

# Vercel Org ID 和 Project ID
# 运行 vercel inspect <deployment-url> 查看
# 或访问 https://vercel.com/dashboard → 项目 → Settings → General
```

**获取 Supabase 凭证：**
```bash
# Access Token
# https://supabase.com/dashboard → Account → Access Tokens → New Token
```

---

## Step 3: 验证部署

### 3.1 访问部署地址

部署成功后，Vercel 会提供一个 URL：
```
https://decideflow-xxx.vercel.app
```

### 3.2 验证功能

按顺序测试以下功能：

```
✅ 访问首页 → 看到 Landing Page
✅ 点击"免费开始" → 跳转注册页
✅ 注册账号 → 收到验证邮件（垃圾箱也检查）
✅ 验证邮箱 → 自动登录
✅ 创建团队 → 看到团队名称
✅ 发起决策 → 填写议题和选项
✅ 提交投票 → 看到实时结果更新
✅ 生成 AI 洞察 → 看到 AI 分析内容
```

### 3.3 配置自定义域名（可选）

1. Vercel → 项目 → **Settings** → **Domains**
2. 输入你的域名（如 `decideflow.yourdomain.com`）
3. 按提示配置 DNS 记录
4. 等待 SSL 证书自动颁发（约 1-2 分钟）

---

## 🔄 自动部署工作流

配置完成后，每次推送到 `main` 分支都会自动：

```
推送代码到 main
       ↓
GitHub Actions 自动触发
       ↓
① 代码质量检查（TypeScript + ESLint）
       ↓
② 构建生产版本
       ↓
③ 部署到 Vercel Production
       ↓
④ Supabase 数据库迁移（如果 schema.sql 有更新）
       ↓
⑤ 自动在 PR/Commit 下评论部署链接
```

每次 Pull Request 也会自动部署 Preview 环境，方便审核。

---

## 🆘 常见问题

### Q: 部署后页面空白？

检查：
1. Supabase **Site URL** 和 **Redirect URLs** 是否正确配置
2. 环境变量 `NEXT_PUBLIC_SUPABASE_URL` 是否正确
3. 浏览器控制台是否有 CORS 错误

### Q: 登录/注册失败？

1. 检查 Supabase **Authentication** → **Settings** 中的 URL 配置
2. 确认 `NEXT_PUBLIC_SUPABASE_URL` 不带尾部斜杠

### Q: AI 洞察不工作？

1. 确认 `OPENAI_API_KEY` 已配置在 Vercel 环境变量中
2. 确认 API Key 有余额（GPT-4o 非常便宜）
3. 查看 Vercel 函数日志（Functions → Logs）

### Q: 投票数据不更新？

1. 确认 Supabase Realtime 已启用（项目 → Database → Replication）
2. 检查 RLS 策略是否正确配置

### Q: 部署太慢？

1. 考虑使用 `@vercel/speed-insights` 优化性能
2. 考虑将静态资源迁移到 Vercel Blob

---

## 💰 成本估算

| 服务 | 计划 | 月费 |
|------|------|------|
| **Vercel** | Hobby | **免费** (100GB 带宽) |
| **Supabase** | Free | **免费** (500MB 数据库, 1GB 存储) |
| **OpenAI** | 按量付费 | **$0.01-0.03 / 次** AI 洞察生成 |
| **域名** | 可选 | **$10-20/年** |

**对于 10 人以下的小团队：完全免费**

---

## 🌐 环境说明

```
┌──────────────────────────────────────────────────────┐
│                   生产环境                            │
│                                                      │
│   Vercel Edge Network                                │
│   ├── Static Assets: CDN 全球分发                    │
│   └── Serverless Functions: 自动扩缩容                │
│           ↓                                          │
│   Supabase                                            │
│   ├── PostgreSQL: 决策/投票/用户数据                  │
│   ├── Realtime: 投票实时更新                         │
│   └── Auth: JWT 用户认证                             │
│           ↓                                          │
│   OpenAI API (按需调用)                              │
│   └── AI 洞察生成                                    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

## 📞 获取帮助

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Dec ideFlow Issues**: https://github.com/your-repo/issues
