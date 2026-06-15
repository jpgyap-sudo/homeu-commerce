import { generateMetadata } from '../../utilities/meta.js';
export const generateCustomViewMetadata = async args => {
  const {
    config,
    // i18n: { t },
    viewConfig
  } = args;
  if (!viewConfig) {
    return null;
  }
  return generateMetadata({
    description: `DaVinciOS`,
    keywords: `DaVinciOS`,
    serverURL: config.serverURL,
    title: 'DaVinciOS',
    ...(config.admin.meta || {}),
    ...(viewConfig.meta || {}),
    openGraph: {
      title: 'DaVinciOS',
      ...(config.admin.meta?.openGraph || {}),
      ...(viewConfig.meta?.openGraph || {})
    }
  });
};
//# sourceMappingURL=generateCustomViewMetadata.js.map