// next.config.mjs
/** @type {import('next').NextConfig} */
const isDev = process.env.NODE_ENV === 'development';

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  
  // Performance optimizations
  compiler: {
    removeConsole: !isDev ? {
      exclude: ['error', 'warn']
    } : false,
    emotion: false,
    styledComponents: false,
  },
  
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  
  // Experimental optimizations
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ['react-icons', '@supabase/supabase-js', 'lucide-react'],
  },

  // Turbopack configuration (replaces deprecated experimental.turbo)
  turbopack: {
    // Add any turbopack-specific configs here if needed
  },
  
  // Modularize imports for better tree shaking
  modularizeImports: {
    'react-icons/fa': {
      transform: 'react-icons/fa/{{member}}',
    },
    'lucide-react': {
      transform: 'lucide-react/dist/esm/icons/{{kebabCase member}}',
    },
  },
  
  // Production optimizations
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  
  // Security: Prevent source maps in production
  env: {
    // Ensure this is never true in production builds
    NODE_ENV: process.env.NODE_ENV || 'production',
  },
  
  // Compression
  compress: true,
  
  // Webpack optimizations to fix large string serialization warning
  webpack: (config, { dev, isServer }) => {
    // DEV MODE: Aggressive optimizations for faster compilation
    if (dev) {
      // Disable cache serialization that causes slowdown
      config.cache = false;
      
      // Reduce parallelism on Windows to avoid overhead
      if (process.platform === 'win32') {
        config.parallelism = 4;
      }
      
      // Skip expensive loaders in development
      config.module.rules = config.module.rules.map(rule => {
        if (rule.test?.toString().includes('svg')) {
          return {
            ...rule,
            type: 'asset/resource',
          };
        }
        return rule;
      });
    }
    
    // PROD: Optimize cache for better performance
    if (!dev && config.cache && !isServer) {
      config.cache.compression = 'gzip';
    }
    
    // Split chunks for better caching
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            default: false,
            vendors: false,
            // Vendor chunk
            vendor: {
              name: 'vendor',
              chunks: 'all',
              test: /node_modules/,
              priority: 20,
            },
            // Common chunk
            common: {
              name: 'common',
              minChunks: 2,
              chunks: 'all',
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
            // Supabase chunk (large library)
            supabase: {
              name: 'supabase',
              test: /[\\/]node_modules[\\/]@supabase[\\/]/,
              chunks: 'all',
              priority: 30,
            },
            // Stripe chunk
            stripe: {
              name: 'stripe',
              test: /[\\/]node_modules[\\/](stripe|@stripe)[\\/]/,
              chunks: 'all',
              priority: 30,
            },
            // React icons chunk
            icons: {
              name: 'icons',
              test: /[\\/]node_modules[\\/]react-icons[\\/]/,
              chunks: 'all',
              priority: 25,
            },
          },
        },
      };
    }
    
    return config;
  },
};

export default nextConfig;
