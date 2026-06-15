'use server';

import { getDaVinciOS } from '@davincios/cms';
import { setDaVinciOSAuthCookie } from '../utilities/setDaVinciOSAuthCookie.js';
export async function login({
  collection,
  config,
  email,
  password,
  username
}) {
  const davincios = await getDaVinciOS({
    config,
    cron: true
  });
  const authConfig = davincios.collections[collection]?.config.auth;
  if (!authConfig) {
    throw new Error(`No auth config found for collection: ${collection}`);
  }
  const loginWithUsername = authConfig?.loginWithUsername ?? false;
  if (loginWithUsername) {
    if (loginWithUsername.allowEmailLogin) {
      if (!email && !username) {
        throw new Error('Email or username is required.');
      }
    } else {
      if (!username) {
        throw new Error('Username is required.');
      }
    }
  } else {
    if (!email) {
      throw new Error('Email is required.');
    }
  }
  let loginData;
  if (loginWithUsername) {
    loginData = username ? {
      password,
      username
    } : {
      email,
      password
    };
  } else {
    loginData = {
      email,
      password
    };
  }
  const result = await davincios.login({
    collection,
    data: loginData
  });
  if (result.token) {
    await setDaVinciOSAuthCookie({
      authConfig,
      cookiePrefix: davincios.config.cookiePrefix,
      token: result.token
    });
  }
  if ('removeTokenFromResponses' in config && config.removeTokenFromResponses) {
    delete result.token;
  }
  return result;
}
//# sourceMappingURL=login.js.map