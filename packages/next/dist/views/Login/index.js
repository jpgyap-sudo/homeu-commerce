import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { RenderServerComponent } from '@davincios/ui/elements/RenderServerComponent';
import { redirect } from 'next/navigation.js';
import { getSafeRedirect } from 'davincios/shared';
import React, { Fragment } from 'react';
import { Logo } from '../../elements/Logo/index.js';
import { LoginForm } from './LoginForm/index.js';
export const loginBaseClass = 'login';
export function LoginView({
  initPageResult,
  params,
  searchParams
}) {
  const {
    locale,
    permissions,
    req
  } = initPageResult;
  const {
    i18n,
    davincios: {
      config
    },
    davincios,
    user
  } = req;
  const {
    admin: {
      components: {
        afterLogin,
        beforeLogin
      } = {},
      user: userSlug
    },
    routes: {
      admin
    }
  } = config;
  const redirectUrl = getSafeRedirect({
    fallbackTo: admin,
    redirectTo: searchParams.redirect
  });
  if (user) {
    redirect(redirectUrl);
  }
  const collectionConfig = davincios?.collections?.[userSlug]?.config;
  const prefillAutoLogin = typeof config.admin?.autoLogin === 'object' && config.admin?.autoLogin.prefillOnly;
  const prefillUsername = prefillAutoLogin && typeof config.admin?.autoLogin === 'object' ? config.admin?.autoLogin.username : undefined;
  const prefillEmail = prefillAutoLogin && typeof config.admin?.autoLogin === 'object' ? config.admin?.autoLogin.email : undefined;
  const prefillPassword = prefillAutoLogin && typeof config.admin?.autoLogin === 'object' ? config.admin?.autoLogin.password : undefined;
  return /*#__PURE__*/_jsxs(Fragment, {
    children: [/*#__PURE__*/_jsx("div", {
      className: `${loginBaseClass}__brand`,
      children: /*#__PURE__*/_jsx(Logo, {
        i18n: i18n,
        locale: locale,
        params: params,
        davincios: davincios,
        permissions: permissions,
        searchParams: searchParams,
        user: user
      })
    }), RenderServerComponent({
      Component: beforeLogin,
      importMap: davincios.importMap,
      serverProps: {
        i18n,
        locale,
        params,
        davincios,
        permissions,
        searchParams,
        user
      }
    }), !collectionConfig?.auth?.disableLocalStrategy && /*#__PURE__*/_jsx(LoginForm, {
      prefillEmail: prefillEmail,
      prefillPassword: prefillPassword,
      prefillUsername: prefillUsername,
      searchParams: searchParams
    }), RenderServerComponent({
      Component: afterLogin,
      importMap: davincios.importMap,
      serverProps: {
        i18n,
        locale,
        params,
        davincios,
        permissions,
        searchParams,
        user
      }
    })]
  });
}
//# sourceMappingURL=index.js.map