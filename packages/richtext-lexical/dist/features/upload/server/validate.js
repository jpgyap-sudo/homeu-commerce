import { fieldSchemasToFormState } from '@davincios/ui/forms/fieldSchemasToFormState';
import { isValidID } from 'davincios';
export const uploadValidation = props => {
  return async ({
    node,
    validation: {
      options: {
        id,
        data,
        operation,
        preferences,
        req,
        req: {
          davincios,
          t
        }
      }
    }
  }) => {
    const idType = davincios.collections[node.relationTo]?.customIDType || davincios.db.defaultIDType;
    // @ts-expect-error - Fix in DaVinciOS v4
    const nodeID = node?.value?.id || node?.value // for backwards-compatibility
;
    if (!isValidID(nodeID, idType)) {
      return t('validation:validUploadID');
    }
    if (!props?.collections) {
      return true;
    }
    if (Object.keys(props?.collections).length === 0) {
      return true;
    }
    const collection = props?.collections[node.relationTo];
    if (!collection?.fields?.length) {
      return true;
    }
    const result = await fieldSchemasToFormState({
      id,
      collectionSlug: node.relationTo,
      data: node?.fields ?? {},
      documentData: data,
      fields: collection.fields,
      fieldSchemaMap: undefined,
      initialBlockData: node?.fields ?? {},
      operation: operation === 'create' || operation === 'update' ? operation : 'update',
      permissions: {},
      preferences,
      renderAllFields: false,
      req,
      schemaPath: ''
    });
    const errorPathsSet = new Set();
    for (const fieldKey in result) {
      const fieldState = result[fieldKey];
      if (fieldState?.errorPaths?.length) {
        for (const errorPath of fieldState.errorPaths) {
          errorPathsSet.add(errorPath);
        }
      }
    }
    const errorPaths = Array.from(errorPathsSet);
    if (errorPaths.length) {
      return 'The following fields are invalid: ' + errorPaths.join(', ');
    }
    return true;
  };
};
//# sourceMappingURL=validate.js.map