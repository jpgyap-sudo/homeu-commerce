import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { HydrateAuthProvider, SetStepNav } from '@davincios/ui';
import { RenderServerComponent } from '@davincios/ui/elements/RenderServerComponent';
import { getGlobalData, getNavGroups } from '@davincios/ui/shared';
import React, { Fragment } from 'react';
import { DefaultDashboard } from './Default/index.js';
export async function DashboardView(props) {
  const {
    locale,
    permissions,
    req: {
      i18n,
      davincios: {
        config
      },
      davincios,
      user
    },
    req,
    visibleEntities
  } = props.initPageResult;
  const globalData = await getGlobalData(req);
  const navGroups = getNavGroups(permissions, visibleEntities, config, i18n);
  return /*#__PURE__*/_jsxs(Fragment, {
    children: [/*#__PURE__*/_jsx(HydrateAuthProvider, {
      permissions: permissions
    }), /*#__PURE__*/_jsx(SetStepNav, {
      nav: []
    }), RenderServerComponent({
      clientProps: {
        locale
      },
      Component: config.admin?.components?.views?.dashboard?.Component,
      Fallback: DefaultDashboard,
      importMap: davincios.importMap,
      serverProps: {
        ...props,
        globalData,
        i18n,
        locale,
        navGroups,
        davincios,
        permissions,
        user,
        visibleEntities
      }
    })]
  });
}
//# sourceMappingURL=index.js.map