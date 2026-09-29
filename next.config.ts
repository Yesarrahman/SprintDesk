import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // Tree-shake these large packages — only the icons/components you actually
    // import get bundled, instead of the entire library.
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'framer-motion',
      '@radix-ui/react-label',
      '@radix-ui/react-slot',
    ],
  },
};

export default nextConfig;
