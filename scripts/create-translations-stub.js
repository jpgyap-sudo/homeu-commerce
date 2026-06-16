'use strict';
/**
 * Generate comprehensive stubs for @davincios/translations.
 *
 * This package provides i18n support for DaVinciOS CMS.
 * The codebase imports from it in two ways:
 *   - Named exports: import { en } from '@davincios/translations/languages/en'
 *   - Named exports: import { initI18n, getTranslation, extractHeaderLanguage } from '@davincios/translations'
 *   - Named exports: import { deepMergeSimple } from '@davincios/translations/utilities'
 *
 * The language stubs must use NAMED exports (NOT export default) because
 * the code imports them as { en }, { ar }, etc.
 */

const fs = require('fs');
const path = require('path');

const pkgDir = 'node_modules/@davincios/translations';
fs.mkdirSync(pkgDir, { recursive: true });

// =============================================================================
// package.json
// =============================================================================
const pkgJson = {
  name: '@davincios/translations',
  version: '3.85.1',
  main: './index.js',
  type: 'module',
  exports: {
    '.': './index.js',
    './package.json': './package.json',
    './utilities': './utilities.js',
    './languages/*': './languages/*.js'
  }
};
fs.writeFileSync(path.join(pkgDir, 'package.json'), JSON.stringify(pkgJson, null, 2));

// =============================================================================
// index.js - Main entry point
// =============================================================================
// Exports needed by the codebase:
//   - getTranslation()          - used by many views/metadata files
//   - initI18n({config, context, language}) - used by createDaVinciOSRequest, getLocalI18n, etc.
//   - rtlLanguages              - used by Root/index.js for RTL layout
//   - extractHeaderLanguage(acceptLanguage) - used by getRequestLanguage.js
//
// initI18n is called with: { config: config.i18n, context: 'api', language }
// and is expected to return an object with a .t() method for translations.

const indexCode = `'use strict';

/**
 * @davincios/translations — DaVinciOS i18n support
 * Auto-generated stub for Docker build compatibility.
 */

// Minimal getTranslation: returns empty string (translations resolved at runtime)
export function getTranslation(translations, key) {
  return translations?.[key] ?? '';
}

// Minimal initI18n: returns an i18n object with a .t() method
export function initI18n({ config, context, language } = {}) {
  const lang = language || 'en';
  return {
    language: lang,
    languages: [lang],
    translations: {},
    t: (key) => key, // pass-through: returns the key itself
    options: config || {}
  };
}

// RTL languages list (empty by default)
export const rtlLanguages = [];

// date-fns locale import stub (used by TranslationProvider)
export function importDateFNSLocale(localeCode) {
  return null;
}

// Translation function stub (used by TranslationProvider)
// Handles both string keys and objects with {key, translations, vars}
export function t(key) {
  if (typeof key === 'object' && key !== null) {
    return key.key || '';
  }
  return key || '';
}

// date-fns locale map stub
export const dateFNSLocales = {};

/**
 * Extracts the primary language code from an Accept-Language header.
 * @param {string} acceptLanguage - e.g. "en-US,en;q=0.9,fr;q=0.8"
 * @returns {string} - e.g. "en"
 */
export function extractHeaderLanguage(acceptLanguage) {
  if (!acceptLanguage) return 'en';
  // Parse Accept-Language: "en-US,en;q=0.9,fr;q=0.8" -> first valid code
  const langs = acceptLanguage.split(',');
  for (const entry of langs) {
    const [code] = entry.trim().split(';');
    if (code) {
      const primary = code.split('-')[0]; // "en-US" -> "en"
      if (primary) return primary.toLowerCase();
    }
  }
  return 'en';
}
`;

fs.writeFileSync(path.join(pkgDir, 'index.js'), indexCode);

// =============================================================================
// utilities.js
// =============================================================================
const utilitiesCode = `'use strict';

export function deepMergeSimple(a, b) {
  if (!a) return b;
  if (!b) return a;
  return { ...a, ...b };
}
`;

fs.writeFileSync(path.join(pkgDir, 'utilities.js'), utilitiesCode);

// =============================================================================
// languages/*.js — All language stubs with NAMED exports
// =============================================================================
// Each file must export a named constant matching the language code.
// The language object needs a .translations property for error messages.
//
// Known error keys used by the codebase (from errors/):
//   - error.notAllowedToPerformAction   (Forbidden)
//   - error.errorDeletingFile            (ErrorDeletingFile)
//   - error.fileUploadError              (FileUploadError)
//   - error.authenticationError          (AuthenticationError)
//   - error.lockedAuth                   (LockedAuth)
//   - error.missingFile                  (MissingFile)
//   - error.notFound                     (NotFound)
//   - error.unauthorized                 (UnauthorizedError)
//   - error.unverifiedEmail              (UnverifiedEmail)
//   - error.validationError              (ValidationError)

function makeLanguageStub(code) {
  const displayNames = {
    en: 'English', ar: 'العربية', az: 'Azərbaycan', bg: 'Български',
    ca: 'Català', cs: 'Čeština', da: 'Dansk', de: 'Deutsch',
    es: 'Español', et: 'Eesti', fa: 'فارسی', fr: 'Français',
    he: 'עברית', hr: 'Hrvatski', hu: 'Magyar', hy: 'Հայերեն',
    id: 'Bahasa Indonesia', is: 'Íslenska', it: 'Italiano',
    ja: '日本語', ko: '한국어', lt: 'Lietuvių', lv: 'Latviešu',
    my: 'မြန်မာ', nb: 'Norsk Bokmål', nl: 'Nederlands',
    pl: 'Polski', pt: 'Português', ro: 'Română', rs: 'Српски',
    rsLatin: 'Srpski', ru: 'Русский', sl: 'Slovenščina',
    sv: 'Svenska', ta: 'தமிழ்', th: 'ไทย', tr: 'Türkçe',
    uk: 'Українська', vi: 'Tiếng Việt', zh: '中文', zhTw: '繁體中文'
  };
  return {
    code,
    translations: {
      general: {
        thisLanguage: displayNames[code] || code,
      },
      error: {
        notAllowedToPerformAction: '',
        errorDeletingFile: '',
        fileUploadError: '',
        authenticationError: '',
        lockedAuth: '',
        missingFile: '',
        notFound: '',
        unauthorized: '',
        unverifiedEmail: '',
        validationError: ''
      }
    },
    toString() { return this.code; }
  };
}

const languages = [
  'ar', 'az', 'bg', 'ca', 'cs', 'da', 'de', 'en', 'es', 'et',
  'fa', 'fr', 'he', 'hr', 'hu', 'hy', 'id', 'is', 'it', 'ja',
  'ko', 'lt', 'lv', 'my', 'nb', 'nl', 'pl', 'pt', 'ro', 'rs',
  'rsLatin', 'ru', 'sl', 'sv', 'ta', 'th', 'tr', 'uk', 'vi', 'zh', 'zhTw'
];

const langDir = path.join(pkgDir, 'languages');
fs.mkdirSync(langDir, { recursive: true });

for (const code of languages) {
  const obj = makeLanguageStub(code);
  const objStr = JSON.stringify(obj, null, 2);
  // Must use NAMED export: "export const en = {...}" not "export default locale"
  const langCode = code; // rsLatin, zhTw keep their casing
  const fileContent = `'use strict';\n\nexport const ${langCode} = ${objStr};\n`;
  fs.writeFileSync(path.join(langDir, `${code}.js`), fileContent);
}

console.log('Created @davincios/translations stubs:');
console.log('  - index.js (' + (indexCode.match(/export (async )?function/g) || []).length + ' functions, ' + (indexCode.match(/export const/g) || []).length + ' constants)');
console.log('  - utilities.js (1 function)');
console.log('  - languages/ (' + languages.length + ' language stubs with NAMED exports)');
