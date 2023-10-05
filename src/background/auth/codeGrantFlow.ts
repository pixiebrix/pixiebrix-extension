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

import {
  type AuthData,
  type IntegrationConfig,
  type OAuth2Context,
} from "@/types/integrationTypes";
import {
  computeChallenge,
  generateVerifier,
  getRandomString,
} from "@/vendors/pkce";
import { BusinessError } from "@/errors/businessErrors";
import axios, { type AxiosResponse } from "axios";
import { getErrorMessage } from "@/errors/errorHelpers";
import { setCachedAuthData } from "@/background/auth/authStorage";

async function codeGrantFlow(
  auth: IntegrationConfig,
  oauth2: OAuth2Context
): Promise<AuthData> {
  const redirect_uri = browser.identity.getRedirectURL("oauth2");

  const {
    code_challenge_method,
    client_secret,
    authorizeUrl: rawAuthorizeUrl,
    tokenUrl: rawTokenUrl,
    ...params
  } = oauth2;

  const authorizeURL = new URL(rawAuthorizeUrl);
  for (const [key, value] of Object.entries({
    redirect_uri,
    response_type: "code",
    display: "page",
    ...params,
  })) {
    authorizeURL.searchParams.set(key, value);
  }

  let code_verifier: string = null;
  let code_challenge: string = null;

  const state = getRandomString(16);
  authorizeURL.searchParams.set("state", state);

  if (code_challenge_method === "S256") {
    code_verifier = generateVerifier();
    code_challenge = await computeChallenge(code_verifier);
    authorizeURL.searchParams.set("code_challenge", code_challenge);
    authorizeURL.searchParams.set(
      "code_challenge_method",
      code_challenge_method
    );
  } else if (code_challenge_method != null) {
    throw new BusinessError(
      // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check; type is `never`
      `Unsupported code challenge method: ${code_challenge_method}`
    );
  }

  const responseUrl = await browser.identity.launchWebAuthFlow({
    url: authorizeURL.href,
    interactive: true,
  });

  if (!responseUrl) {
    throw new Error("Authentication cancelled");
  }

  const authResponse = new URL(responseUrl);

  // Console.debug("OAuth authorize response", authResponse);

  const error = authResponse.searchParams.get("error");
  if (error) {
    throw new Error(
      authResponse.searchParams.get("error_description") ?? error
    );
  }

  if (authResponse.searchParams.get("state") !== state) {
    throw new Error("OAuth2 state mismatch");
  }

  const tokenURL = new URL(rawTokenUrl);

  const tokenBody: Record<string, string> = {
    redirect_uri,
    grant_type: "authorization_code",
    code: authResponse.searchParams.get("code"),
    client_id: params.client_id,
  };

  if (client_secret) {
    tokenBody.client_secret = client_secret;
  }

  if (code_verifier) {
    tokenBody.code_verifier = code_verifier;
  }

  const tokenParams = new URLSearchParams();
  for (const [param, value] of Object.entries(tokenBody)) {
    tokenParams.set(param, value.toString());
  }

  let tokenResponse: AxiosResponse;

  try {
    tokenResponse = await axios.post(tokenURL.href, tokenParams, {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });
  } catch (error) {
    console.error(error);
    throw new Error(`Error getting OAuth2 token: ${getErrorMessage(error)}`);
  }

  const { data, status, statusText } = tokenResponse;

  if (status >= 400) {
    throw new Error(
      `Error getting OAuth2 token: ${statusText ?? "Unknown error"}`
    );
  }

  if (typeof data === "string") {
    let parsed;
    try {
      parsed = new URLSearchParams(data);
    } catch {
      throw new Error(
        "Expected application/x-www-form-urlencoded data for response"
      );
    }

    if (parsed.get("error")) {
      throw new Error(parsed.get("error_description") ?? parsed.get("error"));
    }

    const json = Object.fromEntries(parsed.entries());
    await setCachedAuthData(auth.id, json);
    return json as AuthData;
  }

  if (typeof data === "object") {
    await setCachedAuthData(auth.id, data);
    return data as AuthData;
  }

  throw new TypeError("Error getting OAuth2 token: unexpected response format");
}

export default codeGrantFlow;
