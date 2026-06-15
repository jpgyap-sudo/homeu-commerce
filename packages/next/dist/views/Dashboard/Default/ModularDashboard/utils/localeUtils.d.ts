import type { ClientField, Field } from 'payload';
type AnyField = ClientField | Field;
/**
 * Extracts locale-specific data from widget data stored in preferences.
 *
 * Localized fields are stored as `{ fieldName: { en: "Hello", de: "Hallo" } }` in preferences.
 * This function flattens them to `{ fieldName: "Hello" }` for the given locale,
 * which is the format the form state builder expects.
 *
 * Recursively handles nested field types (group, row, collapsible, tabs).
 */
export declare function extractLocaleData(widgetData: Record<string, unknown>, locale: string, fields: readonly AnyField[]): Record<string, unknown>;
/**
 * Merges locale-specific form data back into the full widget data structure.
 *
 * Non-localized fields are stored directly. Localized fields are stored as
 * `{ fieldName: { en: "Hello", de: "Hallo" } }` so each locale's value is preserved independently.
 *
 * Recursively handles nested field types (group, row, collapsible, tabs).
 */
export declare function mergeLocaleData(existingData: Record<string, unknown>, formData: Record<string, unknown>, locale: string, fields: readonly AnyField[]): Record<string, unknown>;
export {};
//# sourceMappingURL=localeUtils.d.ts.map