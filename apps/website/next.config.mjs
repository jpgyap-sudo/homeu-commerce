import { withPayload as withDaVinciOS } from '@DaVinciOScms/next/withPayload'

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
    ],
  },
}

export default withDaVinciOS(nextConfig)
