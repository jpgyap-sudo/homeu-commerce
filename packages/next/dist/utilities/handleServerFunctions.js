import { _internal_renderFieldHandler, copyDataFromLocaleHandler } from '@davincios/ui/rsc';
import { buildFormStateHandler } from '@davincios/ui/utilities/buildFormState';
import { buildTableStateHandler } from '@davincios/ui/utilities/buildTableState';
import { getFolderResultsComponentAndDataHandler } from '@davincios/ui/utilities/getFolderResultsComponentAndData';
import { schedulePublishHandler } from '@davincios/ui/utilities/schedulePublishHandler';
import { getDefaultLayoutHandler } from '../views/Dashboard/Default/ModularDashboard/renderWidget/getDefaultLayoutServerFn.js';
import { renderWidgetHandler } from '../views/Dashboard/Default/ModularDashboard/renderWidget/renderWidgetServerFn.js';
import { renderDocumentHandler } from '../views/Document/handleServerFunction.js';
import { renderDocumentSlotsHandler } from '../views/Document/renderDocumentSlots.js';
import { renderListHandler } from '../views/List/handleServerFunction.js';
import { initReq } from './initReq.js';
import { slugifyHandler } from './slugify.js';
const baseServerFunctions = {
  'copy-data-from-locale': copyDataFromLocaleHandler,
  'form-state': buildFormStateHandler,
  'get-default-layout': getDefaultLayoutHandler,
  'get-folder-results-component-and-data': getFolderResultsComponentAndDataHandler,
  'render-document': renderDocumentHandler,
  'render-document-slots': renderDocumentSlotsHandler,
  'render-field': _internal_renderFieldHandler,
  'render-list': renderListHandler,
  'render-widget': renderWidgetHandler,
  'schedule-publish': schedulePublishHandler,
  slugify: slugifyHandler,
  'table-state': buildTableStateHandler
};
export const handleServerFunctions = async args => {
  const {
    name: fnKey,
    args: fnArgs,
    config: configPromise,
    importMap,
    serverFunctions: extraServerFunctions
  } = args;
  const {
    cookies,
    locale,
    permissions,
    req
  } = await initReq({
    configPromise,
    importMap,
    key: 'RootLayout'
  });
  const augmentedArgs = {
    ...fnArgs,
    cookies,
    importMap,
    locale,
    permissions,
    req
  };
  const fn = extraServerFunctions?.[fnKey] || baseServerFunctions[fnKey];
  if (!fn) {
    throw new Error(`Unknown Server Function: ${fnKey}`);
  }
  return fn(augmentedArgs);
};
//# sourceMappingURL=handleServerFunctions.js.map