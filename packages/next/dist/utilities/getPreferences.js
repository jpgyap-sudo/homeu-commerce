import { cache } from 'react';
export const getPreferences = cache(async (key, davincios, userID, userSlug) => {
  const result = await davincios.find({
    collection: 'davincios-preferences',
    depth: 0,
    limit: 1,
    pagination: false,
    where: {
      and: [{
        key: {
          equals: key
        }
      }, {
        'user.relationTo': {
          equals: userSlug
        }
      }, {
        'user.value': {
          equals: userID
        }
      }]
    }
  }).then(res => res.docs?.[0]);
  return result;
});
//# sourceMappingURL=getPreferences.js.map