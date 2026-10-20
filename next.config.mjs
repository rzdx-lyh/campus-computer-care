/** 用途：配置 Next.js 运行选项与 monorepo 根目录，避免构建追踪选错目录。 */
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: process.cwd(),
};

export default nextConfig;
