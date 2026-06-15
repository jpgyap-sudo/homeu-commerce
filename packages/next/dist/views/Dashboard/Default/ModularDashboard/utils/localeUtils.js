import { fieldAffectsData, fieldHasSubFields, tabHasName } from '@davincios/cms/shared';
function isLocalized(field) {
  return 'localized' in field && Boolean(field.localized);
}
function getObjectValue(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value : {};
}
/**
 * Extracts locale-specific data from widget data stored in preferences.
 *
 * Localized fields are stored as `{ fieldName: { en: "Hello", de: "Hallo" } }` in preferences.
 * This function flattens them to `{ fieldName: "Hello" }` for the given locale,
 * which is the format the form state builder expects.
 *
 * Recursively handles nested field types (group, row, collapsible, tabs).
 */
export function extractLocaleData(widgetData, locale, fields) {
  const result = {};
  for (const field of fields) {
    if (field.type === 'tabs') {
      for (const tab of field.tabs) {
        const tabFields = tab.fields;
        if (tabHasName(tab)) {
          result[tab.name] = extractLocaleData(getObjectValue(widgetData[tab.name]), locale, tabFields);
        } else {
          Object.assign(result, extractLocaleData(widgetData, locale, tabFields));
        }
      }
      continue;
    }
    if (fieldHasSubFields(field) && !fieldAffectsData(field)) {
      Object.assign(result, extractLocaleData(widgetData, locale, field.fields));
      continue;
    }
    if (!fieldAffectsData(field)) {
      continue;
    }
    const {
      name
    } = field;
    const value = widgetData[name];
    if (fieldHasSubFields(field)) {
      result[name] = extractLocaleData(getObjectValue(value), locale, field.fields);
      continue;
    }
    if (isLocalized(field) && value !== undefined && typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[name] = value[locale];
    } else {
      result[name] = value;
    }
  }
  return result;
}
/**
 * Merges locale-specific form data back into the full widget data structure.
 *
 * Non-localized fields are stored directly. Localized fields are stored as
 * `{ fieldName: { en: "Hello", de: "Hallo" } }` so each locale's value is preserved independently.
 *
 * Recursively handles nested field types (group, row, collapsible, tabs).
 */
export function mergeLocaleData(existingData, formData, locale, fields) {
  const result = {
    ...existingData
  };
  for (const field of fields) {
    if (field.type === 'tabs') {
      for (const tab of field.tabs) {
        const tabFields = tab.fields;
        if (tabHasName(tab)) {
          result[tab.name] = mergeLocaleData(getObjectValue(result[tab.name]), getObjectValue(formData[tab.name]), locale, tabFields);
        } else {
          Object.assign(result, mergeLocaleData(result, formData, locale, tabFields));
        }
      }
      continue;
    }
    if (fieldHasSubFields(field) && !fieldAffectsData(field)) {
      Object.assign(result, mergeLocaleData(result, formData, locale, field.fields));
      continue;
    }
    if (!fieldAffectsData(field)) {
      continue;
    }
    const {
      name
    } = field;
    if (fieldHasSubFields(field)) {
      result[name] = mergeLocaleData(getObjectValue(result[name]), getObjectValue(formData[name]), locale, field.fields);
      continue;
    }
    if (isLocalized(field)) {
      result[name] = {
        ...getObjectValue(result[name]),
        [locale]: formData[name]
      };
    } else {
      result[name] = formData[name];
    }
  }
  return result;
}
//# sourceMappingURL=localeUtils.js.map