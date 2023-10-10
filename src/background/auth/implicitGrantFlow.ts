/*
 * Copyright (C) 2023 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import { type UnknownObject } from "@/types/objectTypes";
import {
  type AuthData,
  type IntegrationConfig,
  type OAuth2Context,
} from "@/types/integrationTypes";
import { getRandomString } from "@/vendors/pkce";
import { setCachedAuthData } from "@/background/auth/authStorage";

function parseResponseParams(url: URL): UnknownObject {
  const hasSearchParams = [...url.searchParams.keys()].length > 0;

  if (hasSearchParams) {
    return Object.fromEntries(url.searchParams.entries());
  }

  // Microsoft returns the params as part of the hash
  if (url.hash) {
    // Remove the leading "#"
    const params = new URLSearchParams(url.hash.slice(1));
    return Object.fromEntries(params.entries());
  }

  throw new Error("Unexpected response URL structure");
}

async function implicitGrantFlow(
  auth: IntegrationConfig,
  oauth2: OAuth2Context
): Promise<AuthData> {
  const redirect_uri = browser.identity.getRedirectURL("oauth2");

  const { client_id, authorizeUrl: rawAuthorizeUrl, ...params } = oauth2;

  const state = getRandomString(16);

  const authorizeURL = new URL(rawAuthorizeUrl);

  for (const [key, value] of Object.entries({
    redirect_uri,
    response_type: "token",
    display: "page",
    client_id,
    state,
    ...params,
  })) {
    authorizeURL.searchParams.set(key, value);
  }

  console.debug("Initiating implicit grant flow", {
    redirect_uri,
    client_id,
    authorize_url: authorizeURL,
  });

  const responseUrl = await browser.identity.launchWebAuthFlow({
    url: authorizeURL.href,
    interactive: true,
  });

  if (!responseUrl) {
    throw new Error("Authentication cancelled");
  }

  const responseParams = parseResponseParams(new URL(responseUrl));

  const { access_token, state: stateResponse, ...rest } = responseParams;

  if (state !== stateResponse) {
    throw new Error("OAuth2 state mismatch");
  }

  if (!access_token) {
    console.warn("Error performing implicit grant flow", {
      responseParams,
      responseUrl,
    });
    throw new Error("Error performing implicit grant flow");
  }

  const data: AuthData = { access_token, ...rest } as unknown as AuthData;
  await setCachedAuthData(auth.id, data);
  return data;
}

export default implicitGrantFlow;
