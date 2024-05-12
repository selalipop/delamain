/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
    transpilePackages: ['@acme/ui', 'lodash-es'],

};

module.exports = {
  transpilePackages: ['whisper-turbo'],
}
export default nextConfig;
