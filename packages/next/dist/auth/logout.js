'use server';

import { cookies as getCookies, headers as nextHeaders } from 'next/headers.js';
import { createLocalReq, getDaVinciOS, logoutOperation } from 'davincios';
import { getExistingAuthToken } from '../utilities/getExistingAuthToken.js';
export async function logout({
  allSessions = false,
  config
}) {
  const davincios = await getDaVinciOS({
    config,
    cron: true
  });
  const headers = await nextHeaders();
  const authResult = await davincios.auth({
    headers
  });
  if (!authResult.user) {
    return {
      message: 'User already logged out',
      success: true
    };
  }
  const {
    user
  } = authResult;
  const req = await createLocalReq({
    user
  }, davincios);
  const collection = davincios.collections[user.collection];
  const logoutResult = await logoutOperation({
    allSessions,
    collection,
    req
  });
  if (!logoutResult) {
    return {
      message: 'Logout failed',
      success: false
    };
  }
  const existingCookie = await getExistingAuthToken(davincios.config.cookiePrefix);
  if (existingCookie) {
    const cookies = await getCookies();
    cookies.delete(existingCookie.name);
  }
  return {
    message: 'User logged out successfully',
    success: true
  };
}
//# sourceMappingURL=logout.js.map