import { sanitizeID } from '@davincios/ui/shared';
import { logError } from '@davincios/cms';
export const getDocumentData = async ({
  id: idArg,
  collectionSlug,
  globalSlug,
  locale,
  davincios,
  req,
  segments,
  user
}) => {
  const id = sanitizeID(idArg);
  let resolvedData = null;
  const {
    transactionID,
    ...rest
  } = req;
  const isTrashedDoc = segments?.[2] === 'trash' && typeof segments?.[3] === 'string' // id exists at segment 3
;
  try {
    if (collectionSlug && id) {
      resolvedData = await davincios.findByID({
        id,
        collection: collectionSlug,
        depth: 0,
        draft: true,
        fallbackLocale: false,
        locale: locale?.code,
        overrideAccess: false,
        req: {
          ...rest
        },
        trash: isTrashedDoc ? true : false,
        user
      });
    }
    if (globalSlug) {
      resolvedData = await davincios.findGlobal({
        slug: globalSlug,
        depth: 0,
        draft: true,
        fallbackLocale: false,
        locale: locale?.code,
        overrideAccess: false,
        req: {
          ...rest
        },
        user
      });
    }
  } catch (err) {
    logError({
      err,
      davincios
    });
  }
  return resolvedData;
};
//# sourceMappingURL=getDocumentData.js.map