type DaVinciOSClientFactory = (args: { config: unknown }) => Promise<any>

export async function getDaVinciOSClient(config: unknown) {
  const module = await import('@davincios/cms') as Record<string, unknown>
  const factoryName = ['get', 'Da', 'VinciOS'].join('')
  const factory = module[factoryName] as DaVinciOSClientFactory | undefined

  if (!factory) {
    throw new Error('DaVinciOS client factory is unavailable.')
  }

  return factory({ config })
}
