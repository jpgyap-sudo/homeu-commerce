import config from '@DaVinciOS-config'
import { GRAPHQL_POST, REST_OPTIONS } from '@davincios/next/routes'

export const POST = GRAPHQL_POST(config)
export const OPTIONS = REST_OPTIONS(config)
