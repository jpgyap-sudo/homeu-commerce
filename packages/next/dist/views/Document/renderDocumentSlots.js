import { ViewDescription } from '@davincios/ui';
import { RenderServerComponent } from '@davincios/ui/elements/RenderServerComponent';
import { hasDraftsEnabled } from '@davincios/cms/shared';
import { getDocumentPermissions } from './getDocumentPermissions.js';
export const renderDocumentSlots = args => {
  const {
    id,
    collectionConfig,
    globalConfig,
    hasSavePermission,
    locale,
    permissions,
    req
  } = args;
  const components = {};
  const unsavedDraftWithValidations = undefined;
  const isPreviewEnabled = collectionConfig?.admin?.preview || globalConfig?.admin?.preview;
  const serverProps = {
    id,
    i18n: req.i18n,
    locale,
    davincios: req.davincios,
    permissions,
    user: req.user
  };
  const BeforeDocumentControls = collectionConfig?.admin?.components?.edit?.beforeDocumentControls || globalConfig?.admin?.components?.elements?.beforeDocumentControls;
  if (BeforeDocumentControls) {
    components.BeforeDocumentControls = RenderServerComponent({
      Component: BeforeDocumentControls,
      importMap: req.davincios.importMap,
      serverProps: serverProps
    });
  }
  const EditMenuItems = collectionConfig?.admin?.components?.edit?.editMenuItems;
  if (EditMenuItems) {
    components.EditMenuItems = RenderServerComponent({
      Component: EditMenuItems,
      importMap: req.davincios.importMap,
      serverProps: serverProps
    });
  }
  const CustomPreviewButton = collectionConfig?.admin?.components?.edit?.PreviewButton || globalConfig?.admin?.components?.elements?.PreviewButton;
  if (isPreviewEnabled && CustomPreviewButton) {
    components.PreviewButton = RenderServerComponent({
      Component: CustomPreviewButton,
      importMap: req.davincios.importMap,
      serverProps: serverProps
    });
  }
  const LivePreview = collectionConfig?.admin?.components?.views?.edit?.livePreview || globalConfig?.admin?.components?.views?.edit?.livePreview;
  if (LivePreview?.Component) {
    components.LivePreview = RenderServerComponent({
      Component: LivePreview.Component,
      importMap: req.davincios.importMap,
      serverProps
    });
  }
  const descriptionFromConfig = collectionConfig?.admin?.description || globalConfig?.admin?.description;
  const staticDescription = typeof descriptionFromConfig === 'function' ? descriptionFromConfig({
    t: req.i18n.t
  }) : descriptionFromConfig;
  const CustomDescription = collectionConfig?.admin?.components?.Description || globalConfig?.admin?.components?.elements?.Description;
  const hasDescription = CustomDescription || staticDescription;
  if (hasDescription) {
    components.Description = RenderServerComponent({
      clientProps: {
        collectionSlug: collectionConfig?.slug,
        description: staticDescription
      },
      Component: CustomDescription,
      Fallback: ViewDescription,
      importMap: req.davincios.importMap,
      serverProps: serverProps
    });
  }
  if (collectionConfig?.versions?.drafts || globalConfig?.versions?.drafts) {
    const CustomStatus = collectionConfig?.admin?.components?.edit?.Status || globalConfig?.admin?.components?.elements?.Status;
    if (CustomStatus) {
      components.Status = RenderServerComponent({
        Component: CustomStatus,
        importMap: req.davincios.importMap,
        serverProps
      });
    }
  }
  if (hasSavePermission) {
    if (hasDraftsEnabled(collectionConfig || globalConfig)) {
      const CustomPublishButton = collectionConfig?.admin?.components?.edit?.PublishButton || globalConfig?.admin?.components?.elements?.PublishButton;
      if (CustomPublishButton) {
        components.PublishButton = RenderServerComponent({
          Component: CustomPublishButton,
          importMap: req.davincios.importMap,
          serverProps: serverProps
        });
      }
      const CustomUnpublishButton = collectionConfig?.admin?.components?.edit?.UnpublishButton || globalConfig?.admin?.components?.elements?.UnpublishButton;
      if (CustomUnpublishButton) {
        components.UnpublishButton = RenderServerComponent({
          Component: CustomUnpublishButton,
          importMap: req.davincios.importMap,
          serverProps: serverProps
        });
      }
      const CustomSaveDraftButton = collectionConfig?.admin?.components?.edit?.SaveDraftButton || globalConfig?.admin?.components?.elements?.SaveDraftButton;
      const draftsEnabled = hasDraftsEnabled(collectionConfig || globalConfig);
      if ((draftsEnabled || unsavedDraftWithValidations) && CustomSaveDraftButton) {
        components.SaveDraftButton = RenderServerComponent({
          Component: CustomSaveDraftButton,
          importMap: req.davincios.importMap,
          serverProps: serverProps
        });
      }
    } else {
      const CustomSaveButton = collectionConfig?.admin?.components?.edit?.SaveButton || globalConfig?.admin?.components?.elements?.SaveButton;
      if (CustomSaveButton) {
        components.SaveButton = RenderServerComponent({
          Component: CustomSaveButton,
          importMap: req.davincios.importMap,
          serverProps: serverProps
        });
      }
    }
  }
  if (collectionConfig?.upload && collectionConfig?.admin?.components?.edit?.Upload) {
    components.Upload = RenderServerComponent({
      Component: collectionConfig.admin.components.edit.Upload,
      importMap: req.davincios.importMap,
      serverProps
    });
  }
  if (collectionConfig?.upload && collectionConfig.upload.admin?.components?.controls) {
    components.UploadControls = RenderServerComponent({
      Component: collectionConfig.upload.admin.components.controls,
      importMap: req.davincios.importMap,
      serverProps
    });
  }
  return components;
};
export const renderDocumentSlotsHandler = async args => {
  const {
    id,
    collectionSlug,
    locale,
    permissions,
    req
  } = args;
  const collectionConfig = req.davincios.collections[collectionSlug]?.config;
  if (!collectionConfig) {
    throw new Error(req.t('error:incorrectCollection'));
  }
  const {
    hasSavePermission
  } = await getDocumentPermissions({
    id,
    collectionConfig,
    data: {},
    req
  });
  return renderDocumentSlots({
    id,
    collectionConfig,
    hasSavePermission,
    locale,
    permissions,
    req
  });
};
//# sourceMappingURL=renderDocumentSlots.js.map