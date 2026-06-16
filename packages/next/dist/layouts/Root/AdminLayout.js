import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { rtlLanguages } from '@davincios/translations';
import { ProgressBar, RootProvider } from '@davincios/ui';
import { getClientConfig } from '@davincios/ui/utilities/getClientConfig';
import { cookies as nextCookies } from 'next/headers.js';
import { applyLocaleFiltering } from '@davincios/cms/shared';
import React, { Suspense } from 'react';
import { getNavPrefs } from '../../elements/Nav/getNavPrefs.js';
import { getRequestTheme } from '../../utilities/getRequestTheme.js';
import { initReq } from '../../utilities/initReq.js';
import { checkDependencies } from './checkDependencies.js';
import { NestProviders } from './NestProviders.js';

/**
 * AdminLayout — Like RootLayout but WITHOUT <html>, <head>, <body> wrapper.
 * 
 * Use this in route group layouts (e.g. app/(DaVinciOS)/layout.tsx) when the
 * root layout already provides <html> and <body>. This avoids React Error #418
 * (nested root elements) and allows proper hydration of the admin UI.
 * 
 * Props are identical to RootLayout.
 */
export const AdminLayout = ({
  children,
  config: configPromise,
  importMap,
  serverFunction
}) => {
  checkDependencies();
  const content = /*#__PURE__*/_jsx(AdminLayoutContent, {
    config: configPromise,
    importMap: importMap,
    serverFunction: serverFunction,
    children: children
  });
  if (process.env.DAVINCIOS_CACHE_COMPONENTS_ENABLED === 'true') {
    return /*#__PURE__*/_jsx(Suspense, {
      fallback: null,
      children: content
    });
  }
  return content;
};

const AdminLayoutContent = async ({
  children,
  config: configPromise,
  importMap,
  serverFunction
}) => {
  const {
    cookies,
    headers,
    languageCode,
    permissions,
    req,
    req: {
      davincios: {
        config
      }
    }
  } = await initReq({
    configPromise,
    importMap,
    key: 'AdminLayout'
  });

  const theme = getRequestTheme({
    config,
    cookies,
    headers
  });

  const dir = rtlLanguages.includes(languageCode) ? 'RTL' : 'LTR';

  const languageOptions = Object.entries(config.i18n.supportedLanguages || {}).reduce((acc, [language, languageConfig]) => {
    if (Object.keys(config.i18n.supportedLanguages).includes(language)) {
      acc.push({
        label: (languageConfig && languageConfig.translations && languageConfig.translations.general && languageConfig.translations.general.thisLanguage) || language,
        value: language
      });
    }
    return acc;
  }, []);

  async function switchLanguageServerAction(lang) {
    'use server';
    const cookies = await nextCookies();
    cookies.set({
      name: `${config.cookiePrefix || '@davincios/cms'}-lng`,
      maxAge: 60 * 60 * 24 * 365,
      path: '/',
      value: lang
    });
  }

  const navPrefs = await getNavPrefs(req);
  const clientConfig = getClientConfig({
    config,
    i18n: req.i18n,
    importMap,
    user: req.user
  });

  await applyLocaleFiltering({
    clientConfig,
    config,
    req
  });

  // Render ONLY the providers, NOT html/head/body (root layout provides those)
  return /*#__PURE__*/_jsxs(RootProvider, {
    config: clientConfig,
    dateFNSKey: req.i18n.dateFNSKey,
    fallbackLang: config.i18n.fallbackLanguage,
    isNavOpen: navPrefs?.open ?? true,
    languageCode: languageCode,
    languageOptions: languageOptions,
    locale: req.locale,
    permissions: req.user ? permissions : null,
    serverFunction: serverFunction,
    switchLanguageServerAction: switchLanguageServerAction,
    theme: theme,
    translations: req.i18n.translations,
    user: req.user,
    children: [
      /*#__PURE__*/_jsx(ProgressBar, {}),
      Array.isArray(config.admin?.components?.providers) && config.admin?.components?.providers.length > 0
        ? /*#__PURE__*/_jsx(NestProviders, {
            importMap: req.davincios.importMap,
            providers: config.admin?.components?.providers,
            serverProps: {
              i18n: req.i18n,
              davincios: req.davincios,
              permissions,
              user: req.user
            },
            children: children
          })
        : children,
      /*#__PURE__*/_jsx("div", {
        id: "portal"
      })
    ]
  });
};
