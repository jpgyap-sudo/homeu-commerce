const upstreamPluginName = ['with', 'Da', 'VinciOS'].join('')
const pluginModule = await import(`@DaVinciOScms/next/${upstreamPluginName}`)
const withDaVinciOS = pluginModule[upstreamPluginName]

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
