/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config, { isServer }) => {
        // Handling punycode deprecation
        config.resolve.fallback = {
            ...config.resolve.fallback,
            punycode: false,
        };

        // Optional: Add source maps for better debugging
        if (!isServer) {
            config.devtool = 'source-map';
        }

        return config;
    },
    // The images config should be at the root level, not inside webpack
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'allofthethings.s3.amazonaws.com',
                port: '',
                pathname: '/brawlerbearz/**',
            },
        ],
    },
    // Add any other Next.js config options here
};

module.exports = nextConfig; 