import { createLocalReq } from 'davincios';
import { populate } from '../../../populateGraphQL/populate.js';
export const getDaVinciOSPopulateFn = async ({
  currentDepth,
  depth,
  draft,
  overrideAccess,
  davincios,
  req,
  showHiddenFields
}) => {
  let reqToUse = req;
  if (req === undefined && davincios) {
    reqToUse = await createLocalReq({}, davincios);
  }
  if (!reqToUse) {
    throw new Error('No req or davincios provided');
  }
  const populateFn = async ({
    id,
    collectionSlug,
    select
  }) => {
    const dataContainer = {};
    await populate({
      id,
      collectionSlug,
      currentDepth,
      data: dataContainer,
      depth,
      draft: draft ?? false,
      key: 'value',
      overrideAccess: overrideAccess ?? true,
      req: reqToUse,
      select,
      showHiddenFields: showHiddenFields ?? false
    });
    return dataContainer.value;
  };
  return populateFn;
};
//# sourceMappingURL=davinciosPopulateFn.js.map