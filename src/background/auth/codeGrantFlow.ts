/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
} from "@/integrations/integrationTypes";
import {
  computeChallenge,
  generateVerifier,
  getRandomString,
} from "@/vendors/pkce";
import { BusinessError } from "@/errors/businessErrors";
import ky from "ky";
import { setCachedAuthData } from "@/background/auth/authStorage";
import { assertNotNullish } from "@/utils/nullishUtils";
import { launchWebAuthFlow } from "@/background/auth/authHelpers";

function throwIfResponseError(parsed: URLSearchParams | FormData): void {
  const error = parsed.get("error") as string | undefined;
  if (error) {
    const parsedDescription = parsed.get("error_description") as
      | string
      | undefined;
    throw new Error(parsedDescription ?? error);
  }
}

/**
 * Retrieve the OAuth2 token using the code grant flow.
 * @param integrationConfig the integration configuration
 * @param oauth2 the instantiated OAuth2 directives
 * @param interactive If false, forces the flow to complete silently, without any user interaction. See
 *  https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/identity/launchWebAuthFlow#interactive
 */
async function codeGrantFlow(
  integrationConfig: IntegrationConfig,
  oauth2: OAuth2Context,
  { interactive }: { interactive: boolean },
): Promise<AuthData> {
  const redirect_uri = browser.identity.getRedirectURL("oauth2");

  const {
    code_challenge_method,
    client_secret,
    authorizeUrl: rawAuthorizeUrl,
    tokenUrl: rawTokenUrl,
    ...params
  } = oauth2;

  assertNotNullish(rawAuthorizeUrl, "`authorizeUrl` was not provided");
  assertNotNullish(rawTokenUrl, "`tokenUrl` was not provided");

  const authorizeURL = new URL(rawAuthorizeUrl);
  for (const [key, value] of Object.entries({
    redirect_uri,
    response_type: "code",
    display: "page",
    ...params,
  })) {
    authorizeURL.searchParams.set(key, value);
  }

  let code_verifier: string | null = null;
  let code_challenge: string | null = null;

  const state = getRandomString(16);
  authorizeURL.searchParams.set("state", state);

  if (code_challenge_method === "S256") {
    code_verifier = generateVerifier();
    code_challenge = await computeChallenge(code_verifier);
    authorizeURL.searchParams.set("code_challenge", code_challenge);
    authorizeURL.searchParams.set(
      "code_challenge_method",
      code_challenge_method,
    );
  } else if (code_challenge_method != null) {
    const exhaustiveCheck: never = code_challenge_method;
    throw new BusinessError(
      `Unsupported code challenge method: ${exhaustiveCheck}`,
    );
  }

  const responseUrl = await launchWebAuthFlow({
    url: authorizeURL.href,
    interactive,
  });

  const authResponse = new URL(responseUrl).searchParams;
  throwIfResponseError(authResponse);

  if (authResponse.get("state") !== state) {
    throw new Error("OAuth2 state mismatch");
  }

  const tokenURL = new URL(rawTokenUrl);

  const code = authResponse.get("code");
  if (!code) {
    throw new Error("OAuth2 code not provided");
  }

  const formData = new FormData();
  formData.append("redirect_uri", redirect_uri);
  formData.append("grant_type", "authorization_code");
  formData.append("code", code);
  formData.append("client_id", params.client_id);

  if (client_secret) {
    formData.append("client_secret", client_secret);
  }

  if (code_verifier) {
    formData.append("code_verifier", code_verifier);
  }

  const response = await ky
    .post(tokenURL, {
      body: formData,
    })
    .catch((error) => {
      throw new Error("Error getting OAuth2 token", { cause: error });
    });

  switch (response.headers.get("Content-Type")) {
    case "application/json": {
      const json: AuthData = await response.json();
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- TODO: Fix IntegrationConfig types
      await setCachedAuthData(integrationConfig.id!, json);
      return json;
    }

    case "application/x-www-form-urlencoded": {
      let parsed;
      try {
        parsed = await response.formData();
      } catch {
        throw new Error(
          "Expected application/x-www-form-urlencoded data for response",
        );
      }

      throwIfResponseError(parsed);

      const json = Object.fromEntries(parsed.entries()) as AuthData;
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- TODO: Fix IntegrationConfig types
      await setCachedAuthData(integrationConfig.id!, json);
      return json;
    }

    default: {
      throw new TypeError(
        "Error getting OAuth2 token: unexpected response format",
      );
    }
  }
}

export default codeGrantFlow;
