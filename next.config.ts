
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  devIndicators: false,
  allowedDevOrigins: ['*.replit.dev', '*.replit.app', '*.spock.replit.dev'],
  outputFileTracingIncludes: {
    '/api/sif-report': ['./public/SIF/**/*.pdf', './public/SIF/extracted/**/*.txt'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  serverExternalPackages: [
    'express',
    'genkit',
    '@genkit-ai/core',
    '@genkit-ai/googleai',
    '@genkit-ai/next',
  ],
};

module.exports = nextConfig;
