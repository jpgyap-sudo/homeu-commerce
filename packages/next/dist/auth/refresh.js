'use server';

import { headers as nextHeaders } from 'next/headers.js';
import { createLocalReq, getDaVinciOS, refreshOperation } from 'davincios';
import { getExistingAuthToken } from '../utilities/getExistingAuthToken.js';
import { setDaVinciOSAuthCookie } from '../utilities/setDaVinciOSAuthCookie.js';
export async function refresh({
  config
}) {
  const davincios = await getDaVinciOS({
    config,
    cron: true
  });
  const headers = await nextHeaders();
  const result = await davincios.auth({
    headers
  });
  if (!result.user) {
    throw new Error('Cannot refresh token: user not authenticated');
  }
  const existingCookie = await getExistingAuthToken(davincios.config.cookiePrefix);
  if (!existingCookie) {
    return {
      message: 'No valid token found to refresh',
      success: false
    };
  }
  const collection = result.user.collection;
  const collectionConfig = davincios.collections[collection];
  if (!collectionConfig?.config.auth) {
    throw new Error(`No auth config found for collection: ${collection}`);
  }
  const req = await createLocalReq({
    user: result.user
  }, davincios);
  const refreshResult = await refreshOperation({
    collection: collectionConfig,
    req
  });
  if (!refreshResult) {
    return {
      message: 'Token refresh failed',
      success: false
    };
  }
  await setDaVinciOSAuthCookie({
    authConfig: collectionConfig.config.auth,
    cookiePrefix: davincios.config.cookiePrefix,
    token: refreshResult.refreshedToken
  });
  return {
    message: 'Token refreshed successfully',
    success: true
  };
}
//# sourceMappingURL=refresh.js.map