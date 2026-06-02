import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 정적 자산 최적화
  experimental: {
    optimizePackageImports: ['@xyflow/react'],
  },
};

export default nextConfig;
