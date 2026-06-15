import { getClientConfig } from '@davincios/ui/utilities/getClientConfig';
import { canAccessAdmin, isEntityHidden, UnauthorizedError } from 'davincios';
import { applyLocaleFiltering } from 'davincios/shared';
import { renderListView } from './index.js';
export const renderListHandler = async args => {
  const {
    collectionSlug,
    cookies,
    disableActions,
    disableBulkDelete,
    disableBulkEdit,
    disableQueryPresets,
    drawerSlug,
    enableRowSelections,
    locale,
    overrideEntityVisibility,
    permissions,
    query,
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
    }
  } = args;
  if (!req.user) {
    throw new UnauthorizedError();
  }
  await canAccessAdmin({
    req
  });
  const clientConfig = getClientConfig({
    config,
    i18n,
    importMap: davincios.importMap,
    user
  });
  await applyLocaleFiltering({
    clientConfig,
    config,
    req
  });
  const preferencesKey = `collection-${collectionSlug}`;
  const preferences = await davincios.find({
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
    List
  } = await renderListView({
    clientConfig,
    disableActions,
    disableBulkDelete,
    disableBulkEdit,
    disableQueryPresets,
    drawerSlug,
    enableRowSelections,
    i18n,
    importMap: davincios.importMap,
    initPageResult: {
      collectionConfig: davincios?.collections?.[collectionSlug]?.config,
      cookies,
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
    params: {
      segments: ['collections', collectionSlug]
    },
    davincios,
    permissions,
    query,
    redirectAfterDelete,
    redirectAfterDuplicate,
    searchParams: {},
    viewType: 'list'
  });
  return {
    List,
    preferences
  };
};
//# sourceMappingURL=handleServerFunction.js.map