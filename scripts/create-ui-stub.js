'use strict';
const fs = require('fs');
const p = 'node_modules/@davincios/ui/';
const mk = (d) => fs.mkdirSync(p + d, { recursive: true });
const wf = (f, c) => fs.writeFileSync(p + f, c);
const R = function () { return null };
const C = function (p) { return p && p.children ? require('react').createElement('div', null, p.children) : null };
const H = function () { return {} };

// index.js
let idx = "'use strict';\nconst React=require('react');\n";
const comps = {
  ProgressBar: R, RootProvider: C, ActionsProvider: C, AppHeader: R,
  BulkUploadProvider: C, EntityVisibilityProvider: C, NavToggler: R, Hamburger: R,
  Gutter: C, ListQueryProvider: C, SetDocumentStepNav: R, SortColumn: R, Pill: R,
  Link: function (p) { return React.createElement('a', p, p && p.children) },
  LoadingOverlayToggle: R, Pagination: R, PerPage: R, Table: R,
  ConfirmPasswordField: R, EmailAndUsernameFields: R, Form: C, FormSubmit: R,
  PasswordField: R, RenderFields: R, DefaultBrowseByFolderView: R, HydrateAuthProvider: R,
  AnimateHeight: R, Button: R, BrowseByFolderButton: R, CheckboxField: R, CheckboxInput: R,
  ChevronIcon: R, ConfirmationModal: R, CopyToClipboard: R, DefaultCollectionFolderView: R,
  DefaultEditView: R, DefaultListView: R, DocumentInfoProvider: C, Drawer: R, DrawerToggler: R,
  EditDepthProvider: C, EditIcon: R, EmailField: R, GearIcon: R, HiddenField: R,
  ItemsDrawer: R, NumberField: R, PasswordConfirmField: R, RadioField: R, RelationshipField: R,
  RichText: R, SelectField: R, SelectAll: R, TabField: R, TabsField: R, TextField: R,
  TextareaField: R, UploadField: R, UIField: R, GroupField: R, Blocks: R, BlockRow: R,
  BlockRows: R, ArrayField: R, CodeField: R, CollapsibleField: R, ConfirmPassword: R,
  DateTimeField: R, JoinField: R, JSONField: R, PointField: R, SelectRow: R, CellButton: R,
  CheckboxCell: R, DateCell: R, EmailCell: R, NumberCell: R, SelectCell: R, TextCell: R,
  TextareaCell: R, UploadCell: R, EditColumn: R, CellDisplay: R, CellValue: R, CellLabel: R,
  ThumbnailCell: R, AdminView: R, AdminPanel: R, Dashboard: R, List: R, Edit: R, APIView: R,
  GlobalView: R, ListView: R, EditView: R, DashboardView: R, DocumentHeader: R,
  DocumentControls: R, Upload: R, UploadCollection: R, AfterInput: R, BeforeInput: R,
  FieldError: R, FieldTypes: R, CollectionCards: R, File: R, DaVinciOSIcon: R, DaVinciOSLogo: R,
  SetStepNav: R, StepNav: R, DocumentStepNav: R, DashboardStepNav: R, VersionPillLabel: R,
  SelectComparison: R, VersionDrawer: R, CreatedAtCell: R, AutoSaveCell: R, DiffCollapser: R,
  Restore: R, RenderFieldsToDiff: R, SearchFilter: R, ListControls: R, ColumnSelector: R,
  DownloadAsCSV: R, WhereBuilder: R, RenderCustomComponents: R, UploadGallery: R, ReactSelect: R,
  FieldDescription: R, FormatDateTime: R, SortArrow: R, LinkToDoc: R, Banner: R,
  FieldDiffContainer: R, FieldDiffLabel: R, FieldLabel: R,
  // --- Missing components identified by auditing all @davincios/ui imports across packages/next/dist ---
  PageConfigProvider: C,       // CRITICAL: imported by views/Root/index.js (causes 500 on /admin/login)
  MinimizeMaximizeIcon: R,     // imported by views/API/index.client.js
  ViewDescription: R,          // imported by Document/renderDocumentSlots.js
  LivePreviewProvider: C,      // imported by views/Document/index.js
  LoadingOverlay: R,           // imported by views/Logout/LogoutClient.js, Version/SelectComparison/VersionDrawer/index.js
  OperationProvider: C,        // imported by Dashboard/Default/ModularDashboard/WidgetConfigDrawer.js
  ShimmerEffect: R,            // imported by Dashboard/Default/ModularDashboard/renderWidget/RenderWidget.js, WidgetConfigDrawer.js, Version/RenderFieldsToDiff/RenderVersionFieldsToDiff.js
  Popup: R,                    // imported by Dashboard/Default/ModularDashboard/index.client.js, elements/Nav/SettingsMenuButton/index.js
  PopupList: R,                // imported by Dashboard/Default/ModularDashboard/index.client.js, Version/Restore/index.js
  XIcon: R,                    // imported by Dashboard/Default/ModularDashboard/index.client.js
  RadioGroupField: R,          // imported by views/Account/ToggleTheme/index.js
  PillSelector: R,             // imported by views/Version/SelectLocales/index.js
  RenderTitle: R,              // imported by elements/DocumentHeader/index.js
  NavGroup: R,                 // imported by elements/Nav/index.client.js
  Logout: R,                   // imported by elements/Nav/index.js
  FolderTypeField: R,          // exported from exports/client.js
  QueryPresetsAccessCell: R,   // exported from exports/client.js
  QueryPresetsColumnField: R,  // exported from exports/client.js
  QueryPresetsColumnsCell: R,  // exported from exports/client.js
  QueryPresetsGroupByCell: R,  // exported from exports/client.js
  QueryPresetsGroupByField: R, // exported from exports/client.js
  QueryPresetsWhereCell: R,    // exported from exports/client.js
  QueryPresetsWhereField: R,   // exported from exports/client.js
  SlugField: R                 // exported from exports/client.js
};
const hooks = {
  useNav: H, useTranslation: function () { return { t: function (s) { return s }, i18n: {} } },
  useConfig: H, useListQuery: H, useAuth: H, useServerFunctions: H, useStepNav: H,
  useDocumentInfo: H, useLocale: H, useForm: H, useFormFields: H, useFormInit: H,
  useFormModified: H, useFormProcessing: H, useFormSubmit: H, useFields: H, useWatchForm: H,
  useFormDependency: H, useTheme: H, usePreferences: H, useGlobals: H, useTitle: H,
  useAllConfig: H, useAllTheme: H, useAllAuth: H, useAllDocumentInfo: H, useAllStepNav: H,
  useAllPreferences: H, useAllTranslations: H, useAllLocales: H, useConfigByPath: H,
  useAllFieldTypes: H, useFieldType: H, useGlobalsByPath: H,
  // --- Missing hooks identified by auditing all @davincios/ui imports across packages/next/dist ---
  useRouteTransition: H,       // imported by views/Logout/LogoutClient.js, Version/Default/index.js, Version/Restore/index.js, Version/SelectComparison/VersionDrawer/CreatedAtCell.js
  useModal: H,                 // imported by views/Account/ResetPreferences/index.js, Dashboard/Default/ModularDashboard/*, Version/Restore/index.js, Version/SelectComparison/VersionDrawer/index.js
  useDocumentTitle: H,         // imported by views/Version/Default/SetStepNav.js
  useEditDepth: H              // imported by views/Version/SelectComparison/VersionDrawer/index.js
};
const vals = {
  formatDate: function (d) { return d }, formatDateTime: function (d) { return d },
  defaultTheme: { colors: {} }, EntityType: {},
  fieldIsPresentationalOnly: function () { return false },
  fieldAffectsData: function () { return false },
  fieldHasSubFields: function () { return false },
  fieldIsBlockType: function () { return false },
  toast: function () { },
  RenderServerComponent: function (p) { return p && p.Component ? React.createElement(p.Component, p) : null },
  // --- Missing values/utilities identified by auditing all @davincios/ui imports across packages/next/dist ---
  formatTimeToNow: function () { return '' },         // imported by views/Version/Default/index.js
  escapeDiffHTML: function (s) { return s },           // imported by Version/RenderFieldsToDiff/fields/Date|Select|Text/index.js
  unescapeDiffHTML: function (s) { return s },         // imported by Version/RenderFieldsToDiff/fields/Date|Select|Text/index.js
  getHTMLDiffComponents: function () { return [] },    // imported by Version/RenderFieldsToDiff/fields/Date|Select|Text/index.js
  fieldBaseClass: ''                                   // imported by views/Version/SelectComparison/index.js
};

for (const [k, v] of Object.entries({ ...comps, ...hooks, ...vals })) {
  idx += 'const ' + k + '=' + (typeof v === 'function' ? v.toString() : JSON.stringify(v)) + ';\n';
}
idx += 'module.exports={' + Object.keys({ ...comps, ...hooks, ...vals }).join(',') + '};\n';
wf('index.js', idx);

// Subpath files
wf('elements/Banner.js', "'use strict';const React=require('react');exports.Banner=function(){return null};\n");
wf('elements/RenderServerComponent.js', "'use strict';const React=require('react');exports.RenderServerComponent=function(p){return p&&p.Component?React.createElement(p.Component,p):null};\n");
wf('rsc.js', "'use strict';const React=require('react');exports.CollectionCards=function(){return null};exports.FieldDiffContainer=function(){return null};exports.File=function(){return null};exports._internal_renderFieldHandler=function(){};exports.copyDataFromLocaleHandler=function(){};exports.upsertPreferences=function(){};\n");
wf('utilities/buildFormState.js', "'use strict';exports.buildFormStateHandler=function(){};exports.buildFormState=function(){};\n");
wf('utilities/buildTableState.js', "'use strict';exports.buildTableStateHandler=function(){};\n");
wf('utilities/getClientSchemaMap.js', "'use strict';exports.getClientSchemaMap=function(){return{}};\n");
wf('utilities/getSchemaMap.js', "'use strict';exports.getSchemaMap=function(){return{}};\n");
wf('utilities/getFolderResultsComponentAndData.js', "'use strict';exports.getFolderResultsComponentAndDataHandler=function(){};exports.getFolderResultsComponentAndData=function(){};\n");
wf('utilities/schedulePublishHandler.js', "'use strict';exports.schedulePublishHandler=function(){};\n");
wf('utilities/getClientConfig.js', "'use strict';function getClientConfig(){return{}}exports.getClientConfig=getClientConfig;\n");
wf('forms/fieldSchemasToFormState.js', "'use strict';exports.fieldSchemasToFormState=function(s){return{}};\n");
wf('utilities/buildFieldSchemaMap/traverseFields.js', "'use strict';exports.traverseFields=function(){};\n");
wf('assets.js', "'use strict';exports.davinciosFaviconDark='';exports.davinciosFaviconLight='';exports.staticOGImage='';\n");
wf('shared.js', "'use strict';const React=require('react');exports.DaVinciOSIcon=function(){return null};exports.DaVinciOSLogo=function(){return null};exports.EntityType={};exports.findLocaleFromCode=function(){};exports.abortAndIgnore=function(){};exports.handleAbortRef=function(){};exports.getVisibleEntities=function(){return[]};\n");

console.log('Created @davincios/ui with ' + Object.keys(comps).length + ' components, ' + Object.keys(hooks).length + ' hooks, ' + Object.keys(vals).length + ' values');
