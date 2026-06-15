import { hasSavePermission as getHasSavePermission, isEditing as getIsEditing } from '@davincios/ui/shared';
import { docAccessOperation, docAccessOperationGlobal, logError } from '@davincios/cms';
import { hasDraftsEnabled } from '@davincios/cms/shared';
export const getDocumentPermissions = async args => {
  const {
    id,
    collectionConfig,
    data = {},
    globalConfig,
    req
  } = args;
  let docPermissions;
  let hasPublishPermission = false;
  let hasTrashPermission = false;
  let hasDeletePermission = false;
  if (collectionConfig) {
    try {
      docPermissions = await docAccessOperation({
        id,
        collection: {
          config: collectionConfig
        },
        data: {
          ...data,
          _status: 'draft'
        },
        req
      });
      if (hasDraftsEnabled(collectionConfig)) {
        hasPublishPermission = (await docAccessOperation({
          id,
          collection: {
            config: collectionConfig
          },
          data: {
            ...data,
            _status: 'published'
          },
          req
        })).update;
      }
      if (collectionConfig.trash) {
        const {
          deletedAt: _,
          ...dataWithoutDeletedAt
        } = data || {};
        const [trashPermissionResult, deletePermissionResult] = await Promise.all([docAccessOperation({
          id,
          collection: {
            config: collectionConfig
          },
          data: {
            ...data,
            deletedAt: new Date().toISOString()
          },
          req
        }), docAccessOperation({
          id,
          collection: {
            config: collectionConfig
          },
          data: dataWithoutDeletedAt,
          req
        })]);
        hasTrashPermission = trashPermissionResult.delete;
        hasDeletePermission = deletePermissionResult.delete;
      } else {
        // When trash is not enabled, delete permission is straightforward
        hasDeletePermission = 'delete' in docPermissions ? Boolean(docPermissions.delete) : false;
        hasTrashPermission = false;
      }
    } catch (err) {
      logError({
        err,
        davincios: req.davincios
      });
    }
  }
  if (globalConfig) {
    try {
      docPermissions = await docAccessOperationGlobal({
        data,
        globalConfig,
        req
      });
      if (hasDraftsEnabled(globalConfig)) {
        hasPublishPermission = (await docAccessOperationGlobal({
          data: {
            ...data,
            _status: 'published'
          },
          globalConfig,
          req
        })).update;
      }
      // Globals don't support trash
      hasDeletePermission = false;
      hasTrashPermission = false;
    } catch (err) {
      logError({
        err,
        davincios: req.davincios
      });
    }
  }
  const hasSavePermission = getHasSavePermission({
    collectionSlug: collectionConfig?.slug,
    docPermissions,
    globalSlug: globalConfig?.slug,
    isEditing: getIsEditing({
      id,
      collectionSlug: collectionConfig?.slug,
      globalSlug: globalConfig?.slug
    })
  });
  return {
    docPermissions,
    hasDeletePermission,
    hasPublishPermission,
    hasSavePermission,
    hasTrashPermission
  };
};
//# sourceMappingURL=getDocumentPermissions.js.map