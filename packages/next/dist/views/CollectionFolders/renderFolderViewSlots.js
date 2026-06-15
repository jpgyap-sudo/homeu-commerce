import { RenderServerComponent } from '@davincios/ui/elements/RenderServerComponent';
export const renderFolderViewSlots = ({
  clientProps,
  collectionConfig,
  description,
  davincios,
  serverProps
}) => {
  const result = {};
  if (collectionConfig.admin.components?.afterList) {
    result.AfterFolderList = RenderServerComponent({
      clientProps: clientProps,
      Component: collectionConfig.admin.components.afterList,
      importMap: davincios.importMap,
      serverProps: serverProps
    });
  }
  const listMenuItems = collectionConfig.admin.components?.listMenuItems;
  if (Array.isArray(listMenuItems)) {
    result.listMenuItems = [RenderServerComponent({
      clientProps,
      Component: listMenuItems,
      importMap: davincios.importMap,
      serverProps
    })];
  }
  if (collectionConfig.admin.components?.afterListTable) {
    result.AfterFolderListTable = RenderServerComponent({
      clientProps: clientProps,
      Component: collectionConfig.admin.components.afterListTable,
      importMap: davincios.importMap,
      serverProps: serverProps
    });
  }
  if (collectionConfig.admin.components?.beforeList) {
    result.BeforeFolderList = RenderServerComponent({
      clientProps: clientProps,
      Component: collectionConfig.admin.components.beforeList,
      importMap: davincios.importMap,
      serverProps: serverProps
    });
  }
  if (collectionConfig.admin.components?.beforeListTable) {
    result.BeforeFolderListTable = RenderServerComponent({
      clientProps: clientProps,
      Component: collectionConfig.admin.components.beforeListTable,
      importMap: davincios.importMap,
      serverProps: serverProps
    });
  }
  if (collectionConfig.admin.components?.Description) {
    result.Description = RenderServerComponent({
      clientProps: {
        collectionSlug: collectionConfig.slug,
        description
      },
      Component: collectionConfig.admin.components.Description,
      importMap: davincios.importMap,
      serverProps: serverProps
    });
  }
  return result;
};
//# sourceMappingURL=renderFolderViewSlots.js.map