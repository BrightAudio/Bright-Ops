// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  
  // Performance optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn']
    } : false,
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
  
  // Compression
  compress: true,
  
  // Webpack optimizations to fix large string serialization warning
  webpack: (config, { dev, isServer }) => {
    // Optimize cache for better performance
    if (config.cache && !isServer) {
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
