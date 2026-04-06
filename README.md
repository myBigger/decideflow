# DecideFlow — 团队决策工具

> 让每一个团队决策，都有迹可循，有据可查，有 AI 辅助。

**[English](README.md) | [中文](README.zh-CN.md)**

---

## ✨ 产品亮点

- 🎯 **四种投票机制** — 简单多数 / 加权投票 / 匿名投票 / 两轮制
- 🤖 **AI 决策洞察** — 风险预警 + 历史分析 + 执行建议
- 📜 **完整决策留档** — 不可篡改、永久可追溯
- ⚡ **实时投票** — Supabase Realtime，投票结果即时更新
- 🔐 **企业级安全** — RLS 行级安全 + JWT 认证
- 🌐 **全球加速** — Vercel Edge Network，毫秒级响应

---

## 🚀 快速开始

### 前置要求

- Node.js 18+
- Supabase 项目
- npm / pnpm / yarn

### 安装

```bash
# 克隆仓库
git clone https://github.com/your-org/decideflow.git
cd decideflow

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env.local
# 填入 NEXT_PUBLIC_SUPABASE_URL 和 NEXT_PUBLIC_SUPABASE_ANON_KEY

# 运行数据库迁移
# 将 supabase/schema.sql 粘贴到 Supabase SQL Editor 执行

# 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000)

---

## 🛠️ 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | Next.js 14 (App Router) |
| 样式 | Tailwind CSS |
| 数据库 | Supabase (PostgreSQL) |
| 实时 | Supabase Realtime |
| 认证 | Supabase Auth |
| AI | OpenAI GPT-4o |
| 部署 | Vercel |
| 语言 | TypeScript |

---

## 📁 项目结构

```
decideflow/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API Routes
│   │   │   ├── auth/         # 认证 API
│   │   │   ├── decisions/     # 决策 API
│   │   │   ├── teams/        # 团队 API
│   │   │   └── ai/           # AI 洞察 API
│   │   ├── auth/             # 认证页面
│   │   ├── dashboard/        # 主应用页面
│   │   └── page.tsx          # Landing Page
│   ├── components/           # React 组件
│   ├── contexts/             # React Context
│   ├── hooks/                # 自定义 Hooks
│   ├── lib/                  # 工具库
│   │   ├── ai/              # AI 服务
│   │   ├── api/              # API 服务封装
│   │   └── supabase/         # Supabase 客户端
│   └── types/                # TypeScript 类型定义
├── supabase/
│   ├── schema.sql            # 数据库迁移脚本
│   └── functions/            # Supabase Edge Functions
├── .github/
│   └── workflows/            # CI/CD 自动化部署
└── vercel.json               # Vercel 配置
```

---

## 🌐 部署

详见 [DEPLOY.md](DEPLOY.md) 完整部署指南。

```bash
# 方式 1: Vercel CLI
vercel --prod

# 方式 2: GitHub Actions（自动部署）
# 推送到 main 分支自动触发 CI/CD
```

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可证

MIT License

---

## 🙏 致谢

- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [Vercel](https://vercel.com/)
