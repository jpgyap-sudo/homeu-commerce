import { upsertPreferences } from '@davincios/ui/rsc';
import { findLocaleFromCode } from '@davincios/ui/shared';
import { getPreferences } from './getPreferences.js';
export async function getRequestLocale({
  req
}) {
  if (req.davincios.config.localization) {
    const localeFromParams = req.query.locale;
    if (req.user && localeFromParams) {
      await upsertPreferences({
        key: 'locale',
        req,
        value: localeFromParams
      });
    }
    return req.user && findLocaleFromCode(req.davincios.config.localization, localeFromParams || (await getPreferences('locale', req.davincios, req.user.id, req.user.collection))?.value) || findLocaleFromCode(req.davincios.config.localization, req.davincios.config.localization.defaultLocale || 'en');
  }
  return undefined;
}
//# sourceMappingURL=getRequestLocale.js.map