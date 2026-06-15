import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Logout } from '@davincios/ui';
import { RenderServerComponent } from '@davincios/ui/elements/RenderServerComponent';
import { EntityType, groupNavItems } from '@davincios/ui/shared';
import React from 'react';
import { NavHamburger } from './NavHamburger/index.js';
import { NavWrapper } from './NavWrapper/index.js';
import { SettingsMenuButton } from './SettingsMenuButton/index.js';
const baseClass = 'nav';
import { getNavPrefs } from './getNavPrefs.js';
import { DefaultNavClient } from './index.client.js';
export const DefaultNav = async props => {
  const {
    documentSubViewType,
    i18n,
    locale,
    params,
    davincios,
    permissions,
    req,
    searchParams,
    user,
    viewType,
    visibleEntities
  } = props;
  if (!davincios?.config) {
    return null;
  }
  const {
    admin: {
      components: {
        afterNav,
        afterNavLinks,
        beforeNav,
        beforeNavLinks,
        logout,
        settingsMenu
      }
    },
    collections,
    globals
  } = davincios.config;
  const groups = groupNavItems([...collections.filter(({
    slug
  }) => visibleEntities.collections.includes(slug)).map(collection => ({
    type: EntityType.collection,
    entity: collection
  })), ...globals.filter(({
    slug
  }) => visibleEntities.globals.includes(slug)).map(global => ({
    type: EntityType.global,
    entity: global
  }))], permissions, i18n);
  const navPreferences = await getNavPrefs(req);
  const LogoutComponent = RenderServerComponent({
    clientProps: {
      documentSubViewType,
      viewType
    },
    Component: logout?.Button,
    Fallback: Logout,
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
  });
  const RenderedSettingsMenu = settingsMenu && Array.isArray(settingsMenu) ? settingsMenu.map((item, index) => RenderServerComponent({
    clientProps: {
      documentSubViewType,
      viewType
    },
    Component: item,
    importMap: davincios.importMap,
    key: `settings-menu-item-${index}`,
    serverProps: {
      i18n,
      locale,
      params,
      davincios,
      permissions,
      searchParams,
      user
    }
  })) : [];
  const RenderedBeforeNav = RenderServerComponent({
    clientProps: {
      documentSubViewType,
      viewType
    },
    Component: beforeNav,
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
  });
  const RenderedBeforeNavLinks = RenderServerComponent({
    clientProps: {
      documentSubViewType,
      viewType
    },
    Component: beforeNavLinks,
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
  });
  const RenderedAfterNavLinks = RenderServerComponent({
    clientProps: {
      documentSubViewType,
      viewType
    },
    Component: afterNavLinks,
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
  });
  const RenderedAfterNav = RenderServerComponent({
    clientProps: {
      documentSubViewType,
      viewType
    },
    Component: afterNav,
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
  });
  return /*#__PURE__*/_jsxs(NavWrapper, {
    baseClass: baseClass,
    children: [RenderedBeforeNav, /*#__PURE__*/_jsxs("nav", {
      className: `${baseClass}__wrap`,
      children: [RenderedBeforeNavLinks, /*#__PURE__*/_jsx(DefaultNavClient, {
        groups: groups,
        navPreferences: navPreferences
      }), RenderedAfterNavLinks, /*#__PURE__*/_jsxs("div", {
        className: `${baseClass}__controls`,
        children: [/*#__PURE__*/_jsx(SettingsMenuButton, {
          settingsMenu: RenderedSettingsMenu
        }), LogoutComponent]
      })]
    }), RenderedAfterNav, /*#__PURE__*/_jsx("div", {
      className: `${baseClass}__header`,
      children: /*#__PURE__*/_jsx("div", {
        className: `${baseClass}__header-content`,
        children: /*#__PURE__*/_jsx(NavHamburger, {
          baseClass: baseClass
        })
      })
    })]
  });
};
//# sourceMappingURL=index.js.map