import { PREFERENCE_KEYS } from 'davincios/shared';
import { cache } from 'react';
export const getNavPrefs = cache(async req => {
  return req?.user?.collection ? await req.davincios.find({
    collection: 'davincios-preferences',
    depth: 0,
    limit: 1,
    pagination: false,
    req,
    where: {
      and: [{
        key: {
          equals: PREFERENCE_KEYS.NAV
        }
      }, {
        'user.relationTo': {
          equals: req.user.collection
        }
      }, {
        'user.value': {
          equals: req?.user?.id
        }
      }]
    }
  })?.then(res => res?.docs?.[0]?.value) : null;
});
//# sourceMappingURL=getNavPrefs.js.map