#!/bin/sh
# Script to create comprehensive @davincios/ui stub
# Called from Dockerfile
# Saves ~50x vs inline echo statements

mkdir -p "$1/utilities" "$1/elements" "$1/forms" "$1/utilities/buildFieldSchemaMap"

# package.json without "type":"module" - CJS stub
cat > "$1/package.json" << 'EOF'
{"name":"@davincios/ui","version":"3.85.1","main":"index.js","exports":{".":"./index.js","./package.json":"./package.json","./utilities/getClientConfig":"./utilities/getClientConfig.js","./elements/Banner":"./elements/Banner.js","./elements/RenderServerComponent":"./elements/RenderServerComponent.js","./rsc":"./rsc.js","./utilities/buildFormState":"./utilities/buildFormState.js","./utilities/buildTableState":"./utilities/buildTableState.js","./utilities/getClientSchemaMap":"./utilities/getClientSchemaMap.js","./utilities/getFolderResultsComponentAndData":"./utilities/getFolderResultsComponentAndData.js","./utilities/getSchemaMap":"./utilities/getSchemaMap.js","./utilities/schedulePublishHandler":"./utilities/schedulePublishHandler.js","./assets":"./assets.js","./shared":"./shared.js","./forms/fieldSchemasToFormState":"./forms/fieldSchemasToFormState.js","./utilities/buildFieldSchemaMap/traverseFields":"./utilities/buildFieldSchemaMap/traverseFields.js"}}
EOF

# Generate the comprehensive index.js stub
cat > "$1/index.js" << 'STUBEOF'
'use strict';
const React = require('react');
function nc(n){var C=function(){return null};C.displayName=n;return C}
function hc(n){return function(){return{}}}
function cc(n){return function(p){return p&&p.children?React.createElement('div',null,p.children):null}}
// ---- Components ----
STUBEOF

# Comprehensive list of ALL known component/hook/value exports
# sourced from @davincios/next/dist and @davincios/cms/dist
cat >> "$1/index.js" << 'COMPS'
const ProgressBar = nc('ProgressBar');
const RootProvider = cc('RootProvider');
const ActionsProvider = cc('ActionsProvider');
const AppHeader = nc('AppHeader');
const BulkUploadProvider = cc('BulkUploadProvider');
const EntityVisibilityProvider = cc('EntityVisibilityProvider');
const NavToggler = nc('NavToggler');
const Hamburger = nc('Hamburger');
const Gutter = cc('Gutter');
const ListQueryProvider = cc('ListQueryProvider');
const SetDocumentStepNav = nc('SetDocumentStepNav');
const SortColumn = nc('SortColumn');
const Pill = nc('Pill');
const Link = function(p){return React.createElement('a',p,p&&p.children)};
const LoadingOverlayToggle = nc('LoadingOverlayToggle');
const Pagination = nc('Pagination');
const PerPage = nc('PerPage');
const Table = nc('Table');
const ConfirmPasswordField = nc('ConfirmPasswordField');
const EmailAndUsernameFields = nc('EmailAndUsernameFields');
const Form = cc('Form');
const FormSubmit = nc('FormSubmit');
const PasswordField = nc('PasswordField');
const RenderFields = nc('RenderFields');
const DefaultBrowseByFolderView = nc('DefaultBrowseByFolderView');
const HydrateAuthProvider = nc('HydrateAuthProvider');
const Banner = nc('Banner');
const RenderServerComponent = function(p){return p&&p.Component?React.createElement(p.Component,p):null};
const FieldDiffContainer = nc('FieldDiffContainer');
const FieldDiffLabel = nc('FieldDiffLabel');
const FieldLabel = nc('FieldLabel');
const AnimateHeight = nc('AnimateHeight');
const Button = nc('Button');
const BrowseByFolderButton = nc('BrowseByFolderButton');
const CheckboxField = nc('CheckboxField');
const CheckboxInput = nc('CheckboxInput');
const ChevronIcon = nc('ChevronIcon');
const ConfirmationModal = nc('ConfirmationModal');
const CopyToClipboard = nc('CopyToClipboard');
const DefaultCollectionFolderView = nc('DefaultCollectionFolderView');
const DefaultEditView = nc('DefaultEditView');
const DefaultListView = nc('DefaultListView');
const DocumentInfoProvider = cc('DocumentInfoProvider');
const Drawer = nc('Drawer');
const DrawerToggler = nc('DrawerToggler');
const EditDepthProvider = cc('EditDepthProvider');
const EditIcon = nc('EditIcon');
const EmailField = nc('EmailField');
const GearIcon = nc('GearIcon');
const HiddenField = nc('HiddenField');
const ItemsDrawer = nc('ItemsDrawer');
const NumberField = nc('NumberField');
const PasswordConfirmField = nc('PasswordConfirmField');
const RadioField = nc('RadioField');
const RelationshipField = nc('RelationshipField');
const RichText = nc('RichText');
const SelectField = nc('SelectField');
const SelectAll = nc('SelectAll');
const TabField = nc('TabField');
const TabsField = nc('TabsField');
const TextField = nc('TextField');
const TextareaField = nc('TextareaField');
const UploadField = nc('UploadField');
const UIField = nc('UIField');
const GroupField = nc('GroupField');
const Blocks = nc('Blocks');
const BlockRow = nc('BlockRow');
const BlockRows = nc('BlockRows');
const ArrayField = nc('ArrayField');
const CodeField = nc('CodeField');
const CollapsibleField = nc('CollapsibleField');
const ConfirmPassword = nc('ConfirmPassword');
const DateTimeField = nc('DateTimeField');
const JoinField = nc('JoinField');
const JSONField = nc('JSONField');
const PointField = nc('PointField');
const SelectRow = nc('SelectRow');
const CellButton = nc('CellButton');
const CheckboxCell = nc('CheckboxCell');
const DateCell = nc('DateCell');
const EmailCell = nc('EmailCell');
const NumberCell = nc('NumberCell');
const SelectCell = nc('SelectCell');
const TextCell = nc('TextCell');
const TextareaCell = nc('TextareaCell');
const UploadCell = nc('UploadCell');
const EditColumn = nc('EditColumn');
const CellDisplay = nc('CellDisplay');
const CellValue = nc('CellValue');
const CellLabel = nc('CellLabel');
const ThumbnailCell = nc('ThumbnailCell');
const AdminView = nc('AdminView');
const AdminPanel = nc('AdminPanel');
const Dashboard = nc('Dashboard');
const List = nc('List');
const Edit = nc('Edit');
const APIView = nc('APIView');
const GlobalView = nc('GlobalView');
const ListView = nc('ListView');
const EditView = nc('EditView');
const DashboardView = nc('DashboardView');
const DocumentHeader = nc('DocumentHeader');
const DocumentControls = nc('DocumentControls');
const Upload = nc('Upload');
const UploadCollection = nc('UploadCollection');
const AfterInput = nc('AfterInput');
const BeforeInput = nc('BeforeInput');
const FieldError = nc('FieldError');
const FieldTypes = nc('FieldTypes');
const CollectionCards = nc('CollectionCards');
const File = nc('File');
const DaVinciOSIcon = nc('DaVinciOSIcon');
const DaVinciOSLogo = nc('DaVinciOSLogo');
const SetStepNav = nc('SetStepNav');
const StepNav = nc('StepNav');
const DocumentStepNav = nc('DocumentStepNav');
const DashboardStepNav = nc('DashboardStepNav');
const VersionPillLabel = nc('VersionPillLabel');
const SelectComparison = nc('SelectComparison');
const VersionDrawer = nc('VersionDrawer');
const CreatedAtCell = nc('CreatedAtCell');
const AutoSaveCell = nc('AutoSaveCell');
const DiffCollapser = nc('DiffCollapser');
const Restore = nc('Restore');
const RenderFieldsToDiff = nc('RenderFieldsToDiff');
const SearchFilter = nc('SearchFilter');
const ListControls = nc('ListControls');
const ColumnSelector = nc('ColumnSelector');
const DownloadAsCSV = nc('DownloadAsCSV');
const WhereBuilder = nc('WhereBuilder');
const RenderCustomComponents = nc('RenderCustomComponents');
const UploadGallery = nc('UploadGallery');
const ReactSelect = nc('ReactSelect');
const FieldDescription = nc('FieldDescription');
const FormatDateTime = nc('FormatDateTime');
// ---- Hooks ----
const useNav = hc('useNav');
const useTranslation = function(){return {t:function(s){return s},i18n:{}}};
const useConfig = hc('useConfig');
const useListQuery = hc('useListQuery');
const useAuth = hc('useAuth');
const useServerFunctions = hc('useServerFunctions');
const useStepNav = hc('useStepNav');
const useDocumentInfo = hc('useDocumentInfo');
const useLocale = hc('useLocale');
const useForm = hc('useForm');
const useFormFields = hc('useFormFields');
const useFormInit = hc('useFormInit');
const useFormModified = hc('useFormModified');
const useFormProcessing = hc('useFormProcessing');
const useFormSubmit = hc('useFormSubmit');
const useFields = hc('useFields');
const useWatchForm = hc('useWatchForm');
const useFormDependency = hc('useFormDependency');
const useTheme = hc('useTheme');
const usePreferences = hc('usePreferences');
const useGlobals = hc('useGlobals');
const useTitle = hc('useTitle');
const useAllConfig = hc('useAllConfig');
const useAllTheme = hc('useAllTheme');
const useAllAuth = hc('useAllAuth');
const useAllDocumentInfo = hc('useAllDocumentInfo');
const useAllStepNav = hc('useAllStepNav');
const useAllPreferences = hc('useAllPreferences');
const useAllTranslations = hc('useAllTranslations');
const useAllLocales = hc('useAllLocales');
const useConfigByPath = hc('useConfigByPath');
const useAllFieldTypes = hc('useAllFieldTypes');
const useFieldType = hc('useFieldType');
const useGlobalsByPath = hc('useGlobalsByPath');
// ---- Values ----
const formatDate = function(d){return d};
const formatDateTime = function(d){return d};
const defaultTheme = {colors:{}};
const EntityType = {};
const fieldIsPresentationalOnly = function(){return false};
const fieldAffectsData = function(){return false};
const fieldHasSubFields = function(){return false};
const fieldIsBlockType = function(){return false};
const toast = function(){};
module.exports = {
COMPS

# Add all exports
grep -oP '^const \w+ = ' "$1/index.js" | sed 's/^const //;s/ = $//' | while read id; do
  echo "  $id,"
done >> "$1/index.js"

echo "};" >> "$1/index.js"

# Create subpath stubs
cat > "$1/elements/Banner.js" << 'EOF'
'use strict';
const React = require('react');
exports.Banner = function(){return null};
EOF

cat > "$1/elements/RenderServerComponent.js" << 'EOF'
'use strict';
const React = require('react');
exports.RenderServerComponent = function(p){return p&&p.Component?React.createElement(p.Component,p):null};
EOF

cat > "$1/rsc.js" << 'EOF'
'use strict';
const React = require('react');
exports.CollectionCards = function(){return null};
exports.FieldDiffContainer = function(){return null};
exports.File = function(){return null};
exports._internal_renderFieldHandler = function(){};
exports.copyDataFromLocaleHandler = function(){};
exports.upsertPreferences = function(){};
EOF

cat > "$1/utilities/buildFormState.js" << 'EOF'
'use strict';
exports.buildFormStateHandler = function(){};
exports.buildFormState = function(){};
EOF

cat > "$1/utilities/buildTableState.js" << 'EOF'
'use strict';
exports.buildTableStateHandler = function(){};
EOF

cat > "$1/utilities/getClientSchemaMap.js" << 'EOF'
'use strict';
exports.getClientSchemaMap = function(){return {}};
EOF

cat > "$1/utilities/getSchemaMap.js" << 'EOF'
'use strict';
exports.getSchemaMap = function(){return {}};
EOF

cat > "$1/utilities/getFolderResultsComponentAndData.js" << 'EOF'
'use strict';
exports.getFolderResultsComponentAndDataHandler = function(){};
exports.getFolderResultsComponentAndData = function(){};
EOF

cat > "$1/utilities/schedulePublishHandler.js" << 'EOF'
'use strict';
exports.schedulePublishHandler = function(){};
EOF

cat > "$1/utilities/getClientConfig.js" << 'EOF'
'use strict';
function getClientConfig(){return {}}exports.getClientConfig=getClientConfig;
EOF

cat > "$1/forms/fieldSchemasToFormState.js" << 'EOF'
'use strict';
exports.fieldSchemasToFormState = function(schemas){return {}};
EOF

cat > "$1/utilities/buildFieldSchemaMap/traverseFields.js" << 'EOF'
'use strict';
exports.traverseFields = function(){};
EOF

cat > "$1/assets.js" << 'EOF'
'use strict';
exports.davinciosFaviconDark = '';
exports.davinciosFaviconLight = '';
exports.staticOGImage = '';
EOF

cat > "$1/shared.js" << 'EOF'
'use strict';
const React = require('react');
exports.DaVinciOSIcon = function(){return null};
exports.DaVinciOSLogo = function(){return null};
exports.EntityType = {};
exports.findLocaleFromCode = function(){};
exports.abortAndIgnore = function(){};
exports.handleAbortRef = function(){};
EOF

echo "  Created @davincios/ui (comprehensive stub with $(grep -cP '^\s+\w+,' "$1/index.js") exports)"
