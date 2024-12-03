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
    // Add any other Next.js config options here
};

module.exports = nextConfig; 