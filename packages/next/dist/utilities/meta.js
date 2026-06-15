import { davinciosFaviconDark, davinciosFaviconLight, staticOGImage } from '@davincios/ui/assets';
import * as qs from 'qs-esm';
const appendTitleSuffix = (title, suffix) => {
  if (!suffix || !title) {
    return title ?? undefined;
  }
  if (typeof title === 'string') {
    return `${title} ${suffix}`;
  }
  if ('default' in title) {
    return {
      default: `${title.default} ${suffix}`,
      template: `${title.template} ${suffix}`
    };
  }
  if ('template' in title) {
    return {
      absolute: `${title.absolute} ${suffix}`,
      template: title.template !== null ? `${title.template} ${suffix}` : null
    };
  }
  return {
    absolute: `${title.absolute} ${suffix}`
  };
};
const getTitleString = title => {
  if (!title) {
    return undefined;
  }
  if (typeof title === 'string') {
    return title;
  }
  if ('absolute' in title) {
    return title.absolute;
  }
  return title.default;
};
const defaultOpenGraph = {
  description: 'DaVinciOS is a headless CMS and application framework built with TypeScript, Node.js, and React.',
  siteName: 'DaVinciOS App',
  title: 'DaVinciOS App'
};
export const generateMetadata = async args => {
  const {
    defaultOGImageType,
    serverURL,
    titleSuffix,
    ...rest
  } = args;
  /**
  * @todo find a way to remove the type assertion here.
  * It is a result of needing to `DeepCopy` the `MetaConfig` type from DaVinciOS.
  * This is required for the `DeepRequired` from `Config` to `SanitizedConfig`.
  */
  const incomingMetadata = rest;
  const icons = incomingMetadata.icons || [{
    type: 'image/png',
    rel: 'icon',
    sizes: '32x32',
    url: typeof davinciosFaviconDark === 'object' ? davinciosFaviconDark?.src : davinciosFaviconDark
  }, {
    type: 'image/png',
    media: '(prefers-color-scheme: dark)',
    rel: 'icon',
    sizes: '32x32',
    url: typeof davinciosFaviconLight === 'object' ? davinciosFaviconLight?.src : davinciosFaviconLight
  }];
  const metaTitle = appendTitleSuffix(incomingMetadata.title, titleSuffix);
  const titleStringForOg = typeof incomingMetadata.openGraph?.title === 'string' ? incomingMetadata.openGraph.title : getTitleString(incomingMetadata.title);
  const ogTitle = [titleStringForOg, titleSuffix].filter(Boolean).join(' ');
  const mergedOpenGraph = {
    ...(defaultOpenGraph || {}),
    ...(defaultOGImageType === 'dynamic' ? {
      images: [{
        alt: ogTitle,
        height: 630,
        url: `/api/og${qs.stringify({
          description: incomingMetadata.openGraph?.description || defaultOpenGraph.description,
          title: ogTitle
        }, {
          addQueryPrefix: true
        })}`,
        width: 1200
      }]
    } : {}),
    ...(defaultOGImageType === 'static' ? {
      images: [{
        alt: ogTitle,
        height: 480,
        url: typeof staticOGImage === 'object' ? staticOGImage?.src : staticOGImage,
        width: 640
      }]
    } : {}),
    title: ogTitle,
    ...(incomingMetadata.openGraph || {})
  };
  return Promise.resolve({
    ...incomingMetadata,
    icons,
    metadataBase: new URL(serverURL || process.env.DAVINCIOS_PUBLIC_SERVER_URL || `http://localhost:${process.env.PORT || 3000}`),
    openGraph: mergedOpenGraph,
    title: metaTitle
  });
};
//# sourceMappingURL=meta.js.map