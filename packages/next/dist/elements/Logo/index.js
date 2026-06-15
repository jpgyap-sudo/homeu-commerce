import { RenderServerComponent } from '@davincios/ui/elements/RenderServerComponent';
import { DaVinciOSLogo } from '@davincios/ui/shared';
export const Logo = props => {
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
    admin: {
      components: {
        graphics: {
          Logo: CustomLogo
        } = {
          Logo: undefined
        }
      } = {}
    } = {}
  } = davincios.config;
  return RenderServerComponent({
    Component: CustomLogo,
    Fallback: DaVinciOSLogo,
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
};
//# sourceMappingURL=index.js.map