import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Gutter } from '@davincios/ui';
import { RenderServerComponent } from '@davincios/ui/elements/RenderServerComponent';
import React from 'react';
import { ModularDashboard } from './ModularDashboard/index.js';
const baseClass = 'dashboard';
export function DefaultDashboard(props) {
  const {
    i18n,
    locale,
    params,
    davincios,
    permissions,
    searchParams,
    user
  } = props;
  const {
    afterDashboard,
    beforeDashboard
  } = davincios.config.admin.components;
  return /*#__PURE__*/_jsxs(Gutter, {
    className: baseClass,
    children: [beforeDashboard && RenderServerComponent({
      Component: beforeDashboard,
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
    }), /*#__PURE__*/_jsx(ModularDashboard, {
      ...props
    }), afterDashboard && RenderServerComponent({
      Component: afterDashboard,
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