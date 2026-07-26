import createNextIntlPlugin from 'next-intl/plugin';
 
const withNextIntl = createNextIntlPlugin();
 
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['geist'],
};
 
export default withNextIntl(nextConfig);
