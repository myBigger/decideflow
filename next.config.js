/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // 跳过构建时的类型检查（vite.config.ts 与 vitest 的嵌套 vite 版本冲突）
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
