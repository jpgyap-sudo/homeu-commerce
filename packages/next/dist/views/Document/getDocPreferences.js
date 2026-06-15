import { sanitizeID } from '@davincios/ui/shared';
export const getDocPreferences = async ({
  id,
  collectionSlug,
  globalSlug,
  davincios,
  user
}) => {
  let preferencesKey;
  if (collectionSlug && id) {
    preferencesKey = `collection-${collectionSlug}-${id}`;
  }
  if (globalSlug) {
    preferencesKey = `global-${globalSlug}`;
  }
  if (preferencesKey) {
    const preferencesResult = await davincios.find({
      collection: 'davincios-preferences',
      depth: 0,
      limit: 1,
      where: {
        and: [{
          key: {
            equals: preferencesKey
          }
        }, {
          'user.relationTo': {
            equals: user.collection
          }
        }, {
          'user.value': {
            equals: sanitizeID(user.id)
          }
        }]
      }
    });
    if (preferencesResult?.docs?.[0]?.value) {
      return preferencesResult.docs[0].value;
    }
  }
  return {
    fields: {}
  };
};
//# sourceMappingURL=getDocPreferences.js.map