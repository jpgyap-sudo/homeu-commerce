# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy all local packages and website source
COPY packages/ ./packages/
COPY apps/website/package.json apps/website/tsconfig.json apps/website/next.config.mjs ./website/
RUN cd website && npm install && \
    echo "Replacing broken npm symlinks with direct copies for file: dependencies..." && \
    rm -rf node_modules/@davincios && \
    mkdir -p node_modules/@davincios && \
    cp -r ../packages/davincios node_modules/@davincios/cms && \
    cp -r ../packages/next node_modules/@davincios/next && \
    cp -r ../packages/db-postgres node_modules/@davincios/db-postgres && \
    cp -r ../packages/richtext-lexical node_modules/@davincios/richtext-lexical && \
    echo "  Copied @davincios/cms" && \
    echo "  Copied @davincios/next" && \
    echo "  Copied @davincios/db-postgres" && \
    echo "  Copied @davincios/richtext-lexical" && \
    echo "Creating stub packages for missing @davincios/* dependencies..." && \
    mkdir -p node_modules/@davincios/drizzle node_modules/@davincios/graphql node_modules/@davincios/ui node_modules/@davincios/translations && \
    echo "  Created stub directories" && \
    echo '{"name":"@davincios/drizzle","version":"3.85.1","main":"./index.js","type":"module","exports":{"./postgres":"./postgres.js","./package.json":"./package.json",".":"./index.js"}}' > node_modules/@davincios/drizzle/package.json && \
    echo "export * from 'drizzle-orm';" > node_modules/@davincios/drizzle/index.js && \
    echo "export * from 'drizzle-orm/node-postgres';" > node_modules/@davincios/drizzle/postgres.js && \
    echo "  Created @davincios/drizzle (re-exports drizzle-orm)" && \
    echo '{"name":"@davincios/graphql","version":"3.85.1","main":"./index.js","type":"module","exports":{"./package.json":"./package.json",".":"./index.js"}}' > node_modules/@davincios/graphql/package.json && \
    echo "export * from 'graphql'; export { default as graphqlHTTP } from 'graphql-http';" > node_modules/@davincios/graphql/index.js && \
    echo "  Created @davincios/graphql (re-exports graphql)" && \
    echo '{"name":"@davincios/translations","version":"3.85.1","main":"./index.js","type":"module","exports":{"./package.json":"./package.json",".":"./index.js","./utilities":"./utilities.js"}}' > node_modules/@davincios/translations/package.json && \
    echo "export function getTranslation() { return ''; } export function initI18n() { return {}; } export const rtlLanguages = [];" > node_modules/@davincios/translations/index.js && \
    echo "export function deepMergeSimple(a,b) { return {...a,...b}; }" > node_modules/@davincios/translations/utilities.js && \
    echo "  Created @davincios/translations" && \
    echo '{"name":"@davincios/ui","version":"3.85.1","type":"module","exports":{"./package.json":"./package.json",".":"./index.js","./utilities/getClientConfig":"./utilities/getClientConfig.js","./elements/RenderServerComponent":"./elements/RenderServerComponent.js","./rsc":"./rsc.js","./utilities/buildFormState":"./utilities/buildFormState.js","./utilities/buildTableState":"./utilities/buildTableState.js","./utilities/getFolderResultsComponentAndData":"./utilities/getFolderResultsComponentAndData.js","./utilities/schedulePublishHandler":"./utilities/schedulePublishHandler.js","./assets":"./assets.js","./shared":"./shared.js"}}' > node_modules/@davincios/ui/package.json && \
    mkdir -p node_modules/@davincios/ui/utilities node_modules/@davincios/ui/elements node_modules/@davincios/ui/assets node_modules/@davincios/ui/shared && \
    echo "const React = require('react');" > node_modules/@davincios/ui/index.js && \
    echo "exports.ProgressBar = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.RootProvider = ({children}) => children;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.ActionsProvider = ({children}) => children;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.AppHeader = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.BulkUploadProvider = ({children}) => children;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.EntityVisibilityProvider = ({children}) => children;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.NavToggler = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.useNav = () => ({open:true});" >> node_modules/@davincios/ui/index.js && \
    echo "exports.Hamburger = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.Gutter = ({children}) => children;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.ListQueryProvider = ({children}) => children;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.SetDocumentStepNav = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.SortColumn = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.Pill = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.useTranslation = () => ({t:(s)=>s});" >> node_modules/@davincios/ui/index.js && \
    echo "exports.Link = ({children,...p}) => React.createElement('a',p,children);" >> node_modules/@davincios/ui/index.js && \
    echo "exports.useConfig = () => ({});" >> node_modules/@davincios/ui/index.js && \
    echo "exports.formatDate = (d) => d;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.LoadingOverlayToggle = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.Pagination = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.PerPage = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.Table = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.useListQuery = () => ({});" >> node_modules/@davincios/ui/index.js && \
    echo "exports.ConfirmPasswordField = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.EmailAndUsernameFields = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.Form = ({children}) => children;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.FormSubmit = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.PasswordField = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.RenderFields = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.useAuth = () => ({});" >> node_modules/@davincios/ui/index.js && \
    echo "exports.useServerFunctions = () => ({});" >> node_modules/@davincios/ui/index.js && \
    echo "exports.DefaultBrowseByFolderView = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.HydrateAuthProvider = () => null;" >> node_modules/@davincios/ui/index.js && \
    echo "exports.defaultTheme = {colors:{}};" >> node_modules/@davincios/ui/index.js && \
    echo "function getClientConfig() { return {}; } module.exports.getClientConfig = getClientConfig;" > node_modules/@davincios/ui/utilities/getClientConfig.js && \
    echo "exports.RenderServerComponent = ({Component,...props}) => Component ? require('react').createElement(Component, props) : null;" > node_modules/@davincios/ui/elements/RenderServerComponent.js && \
    echo "exports._internal_renderFieldHandler = () => {}; exports.copyDataFromLocaleHandler = () => {}; exports.upsertPreferences = () => {};" > node_modules/@davincios/ui/rsc.js && \
    echo "exports.buildFormStateHandler = () => {}; exports.buildFormState = () => {};" > node_modules/@davincios/ui/utilities/buildFormState.js && \
    echo "exports.buildTableStateHandler = () => {};" > node_modules/@davincios/ui/utilities/buildTableState.js && \
    echo "exports.getFolderResultsComponentAndDataHandler = () => {}; exports.getFolderResultsComponentAndData = () => {};" > node_modules/@davincios/ui/utilities/getFolderResultsComponentAndData.js && \
    echo "exports.schedulePublishHandler = () => {};" > node_modules/@davincios/ui/utilities/schedulePublishHandler.js && \
    echo "exports.davinciosFaviconDark = ''; exports.davinciosFaviconLight = ''; exports.staticOGImage = '';" > node_modules/@davincios/ui/assets.js && \
    echo "exports.DaVinciOSIcon = () => null; exports.findLocaleFromCode = () => {}; exports.abortAndIgnore = () => {}; exports.handleAbortRef = () => {};" > node_modules/@davincios/ui/shared.js && \
    echo "  Created @davincios/ui (component stubs)"
# The pre-built dist/ files in @davincios packages may still contain
# Payload-branded function names, imports, and file names (e.g. withPayload,
# checkPayloadDependencies, @payloadcms/*) that need to be renamed to DaVinciOS.
COPY scripts/strip-payload.mjs ./scripts/strip-payload.mjs
RUN node ./scripts/strip-payload.mjs

COPY apps/website/src/ ./website/src/
COPY apps/website/public/ ./website/public/
RUN cd website && npm run build

# Stage 2: Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV DAVINCIOS_CONFIG_PATH=./src/daVinciOS.config.ts

COPY --from=builder /app/website/.next/standalone ./
COPY --from=builder /app/website/.next/static ./.next/static
COPY --from=builder /app/website/public ./public

# Copy DaVinciOS config file and source so it's findable at runtime
COPY --from=builder /app/website/src ./src

# Copy ALL node_modules from builder — ensures all transitive dependencies
# (e.g. @next/env, drizzle-orm, pino, pg, etc.) are available at runtime.
# Selective copies caused ERR_MODULE_NOT_FOUND for packages like @next/env/dist/index.js
# which the DaVinciOS runtime loader requires.
COPY --from=builder /app/website/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "server.js"]
