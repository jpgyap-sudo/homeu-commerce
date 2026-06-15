import { cookies as getCookies } from 'next/headers.js';
import { generateDaVinciOSCookie } from '@davincios/cms';
export async function setDaVinciOSAuthCookie({
  authConfig,
  cookiePrefix,
  token
}) {
  const cookies = await getCookies();
  const cookieExpiration = authConfig.tokenExpiration ? new Date(Date.now() + authConfig.tokenExpiration) : undefined;
  const davinciosCookie = generateDaVinciOSCookie({
    collectionAuthConfig: authConfig,
    cookiePrefix,
    expires: cookieExpiration,
    returnCookieAsObject: true,
    token
  });
  if (davinciosCookie.value) {
    cookies.set(davinciosCookie.name, davinciosCookie.value, {
      domain: authConfig.cookies.domain,
      expires: davinciosCookie.expires ? new Date(davinciosCookie.expires) : undefined,
      httpOnly: true,
      sameSite: typeof authConfig.cookies.sameSite === 'string' ? authConfig.cookies.sameSite.toLowerCase() : 'lax',
      secure: authConfig.cookies.secure || false
    });
  }
}
//# sourceMappingURL=setDaVinciOSAuthCookie.js.map