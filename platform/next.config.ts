import type { NextConfig } from 'next';
import path from 'path';

const nextConfig: NextConfig = {
  // Fix workspace root detection when there are multiple package-lock.json files
  outputFileTracingRoot: path.join(__dirname, '../'),
  serverExternalPackages: ['@prisma/client', 'bcryptjs'],
};

export default nextConfig;
