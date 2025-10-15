// /** @type {import('next').NextConfig} */
// const nextConfig = {
//   reactStrictMode: true,
// };
// export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['hrms.rakolsoft.com', 'localhost'],
    unoptimized: true,
  },
};
export default nextConfig;
