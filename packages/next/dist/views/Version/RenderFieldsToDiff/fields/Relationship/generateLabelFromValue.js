import { fieldAffectsData, fieldIsPresentationalOnly, fieldShouldBeLocalized, flattenTopLevelFields } from 'davincios/shared';
export const generateLabelFromValue = async ({
  field,
  locale,
  parentIsLocalized,
  req,
  value
}) => {
  let relatedDoc;
  let relationTo = field.relationTo;
  let valueToReturn = '';
  if (typeof value === 'object' && 'relationTo' in value) {
    relatedDoc = value.value;
    relationTo = value.relationTo;
  } else {
    // Non-polymorphic relationship or deleted document
    relatedDoc = value;
  }
  const relatedCollection = req.davincios.collections[relationTo].config;
  const useAsTitle = relatedCollection?.admin?.useAsTitle;
  const flattenedRelatedCollectionFields = flattenTopLevelFields(relatedCollection.fields, {
    moveSubFieldsToTop: true
  });
  const useAsTitleField = flattenedRelatedCollectionFields.find(f => fieldAffectsData(f) && !fieldIsPresentationalOnly(f) && f.name === useAsTitle);
  let titleFieldIsLocalized = false;
  if (useAsTitleField && fieldAffectsData(useAsTitleField)) {
    titleFieldIsLocalized = fieldShouldBeLocalized({
      field: useAsTitleField,
      parentIsLocalized
    });
  }
  if (typeof relatedDoc?.[useAsTitle] !== 'undefined') {
    valueToReturn = relatedDoc[useAsTitle];
  } else if (typeof relatedDoc === 'string' || typeof relatedDoc === 'number') {
    // When relatedDoc is just an ID (due to maxDepth: 0), fetch the document to get the title
    try {
      const fetchedDoc = await req.davincios.findByID({
        id: relatedDoc,
        collection: relationTo,
        depth: 0,
        locale: titleFieldIsLocalized ? locale : undefined,
        req,
        select: {
          [useAsTitle]: true
        }
      });
      if (fetchedDoc?.[useAsTitle]) {
        valueToReturn = fetchedDoc[useAsTitle];
      } else {
        valueToReturn = `${req.i18n.t('general:untitled')} - ID: ${relatedDoc}`;
      }
    } catch (error) {
      // Document might have been deleted or user doesn't have access
      valueToReturn = `${req.i18n.t('general:untitled')} - ID: ${relatedDoc}`;
    }
  } else {
    valueToReturn = String(typeof relatedDoc === 'object' ? relatedDoc.id : relatedDoc);
  }
  if (typeof valueToReturn === 'object' && valueToReturn && titleFieldIsLocalized && valueToReturn?.[locale]) {
    valueToReturn = valueToReturn[locale];
  }
  if (valueToReturn && typeof valueToReturn === 'object' && valueToReturn !== null || typeof valueToReturn !== 'string') {
    valueToReturn = JSON.stringify(valueToReturn);
  }
  return valueToReturn;
};
//# sourceMappingURL=generateLabelFromValue.js.map