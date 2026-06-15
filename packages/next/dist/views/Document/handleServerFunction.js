import { getClientConfig } from '@davincios/ui/utilities/getClientConfig';
import { canAccessAdmin, isEntityHidden } from '@davincios/cms';
import { applyLocaleFiltering } from '@davincios/cms/shared';
import { renderDocument } from './index.js';
export const renderDocumentHandler = async args => {
  const {
    collectionSlug,
    cookies,
    disableActions,
    docID,
    drawerSlug,
    initialData,
    locale,
    overrideEntityVisibility,
    paramsOverride,
    permissions,
    redirectAfterCreate,
    redirectAfterDelete,
    redirectAfterDuplicate,
    req,
    req: {
      i18n,
      davincios,
      davincios: {
        config
      },
      user
    },
    searchParams = {},
    versions
  } = args;
  await canAccessAdmin({
    req
  });
  const clientConfig = getClientConfig({
    config,
    i18n,
    importMap: req.davincios.importMap,
    user
  });
  await applyLocaleFiltering({
    clientConfig,
    config,
    req
  });
  let preferences;
  if (docID) {
    const preferencesKey = `${collectionSlug}-edit-${docID}`;
    preferences = await davincios.find({
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
            equals: user.id
          }
        }]
      }
    }).then(res => res.docs[0]?.value);
  }
  const visibleEntities = {
    collections: davincios.config.collections.map(({
      slug,
      admin: {
        hidden
      }
    }) => !isEntityHidden({
      hidden,
      user
    }) ? slug : null).filter(Boolean),
    globals: davincios.config.globals.map(({
      slug,
      admin: {
        hidden
      }
    }) => !isEntityHidden({
      hidden,
      user
    }) ? slug : null).filter(Boolean)
  };
  const {
    data,
    Document
  } = await renderDocument({
    clientConfig,
    disableActions,
    documentSubViewType: 'default',
    drawerSlug,
    i18n,
    importMap: davincios.importMap,
    initialData,
    initPageResult: {
      collectionConfig: davincios?.collections?.[collectionSlug]?.config,
      cookies,
      docID,
      globalConfig: davincios.config.globals.find(global => global.slug === collectionSlug),
      languageOptions: undefined,
      locale,
      permissions,
      req,
      translations: undefined,
      visibleEntities
    },
    locale,
    overrideEntityVisibility,
    params: paramsOverride ?? {
      segments: ['collections', collectionSlug, String(docID)]
    },
    davincios,
    permissions,
    redirectAfterCreate,
    redirectAfterDelete,
    redirectAfterDuplicate,
    searchParams,
    versions,
    viewType: 'document'
  });
  return {
    data,
    Document,
    preferences
  };
};
//# sourceMappingURL=handleServerFunction.js.map