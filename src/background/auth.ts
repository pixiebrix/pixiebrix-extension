/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import axios from "axios";
import { readStorage, setStorage } from "@/chrome";
import { isBackgroundPage } from "webext-detect-page";
import { IService, AuthData, RawServiceConfiguration } from "@/core";
import urljoin from "url-join";
import { browser } from "webextension-polyfill-ts";

const OAUTH2_STORAGE_KEY = "OAUTH2";

async function setCachedAuthData(
  key: string,
  data: Record<string, string>
): Promise<void> {
  if (!isBackgroundPage()) {
    throw new Error("Only the background page can access oauth2 information");
  }
  const current = JSON.parse((await readStorage(OAUTH2_STORAGE_KEY)) ?? "{}");
  await setStorage(
    OAUTH2_STORAGE_KEY,
    JSON.stringify({
      ...current,
      [key]: data,
    })
  );
}

export async function getCachedAuthData<T extends AuthData>(
  key: string
): Promise<T> {
  if (!isBackgroundPage()) {
    throw new Error("Only the background page can access oauth2 information");
  }
  const current = new Map<string, T>(
    Object.entries(JSON.parse((await readStorage(OAUTH2_STORAGE_KEY)) ?? "{}"))
  );
  return current.get(key);
}

export async function deleteCachedAuthData(key: string): Promise<void> {
  if (!isBackgroundPage()) {
    throw new Error("Only the background page can access oauth2 information");
  }
  const current = JSON.parse((await readStorage(OAUTH2_STORAGE_KEY)) ?? "{}");
  delete current[key];
  await setStorage(OAUTH2_STORAGE_KEY, JSON.stringify(current));
}

export async function getToken(
  service: IService,
  auth: RawServiceConfiguration
): Promise<AuthData> {
  if (!service.isToken) {
    throw new Error(`Service ${service.id} does not use token authentication`);
  }

  const { url, data } = await service.getTokenContext(auth.config);

  const { status, statusText, data: responseData } = await axios.post(
    url,
    data
  );

  if (status >= 400) {
    throw new Error(statusText);
  }

  await setCachedAuthData(auth.id, responseData);

  return data as AuthData;
}

export async function launchOAuth2Flow(
  service: IService,
  auth: RawServiceConfiguration
): Promise<AuthData> {
  // reference: https://github.com/kylpo/salesforce-chrome-oauth/blob/master/index.js
  if (!service.isOAuth2) {
    throw new Error(`Service ${service.id} is not an OAuth2 service`);
  }

  const oauth2 = await service.getOAuth2Context(auth.config);
  console.debug("OAuth2 context", oauth2);
  const { host, ...params } = oauth2;

  const redirect_uri = browser.identity.getRedirectURL("oauth2");

  const authorizeURL = new URL(urljoin(host, "/services/oauth2/authorize"));
  for (const [key, value] of Object.entries({
    redirect_uri,
    response_type: "code",
    display: "page",
    ...params,
  })) {
    authorizeURL.searchParams.set(key, value);
  }

  const responseUrl = await browser.identity.launchWebAuthFlow({
    url: authorizeURL.toString(),
    interactive: true,
  });

  if (!responseUrl) {
    throw new Error("Authentication cancelled");
  }

  const authResponse = new URL(responseUrl);

  const error = authResponse.searchParams.get("error");
  if (error) {
    throw new Error(
      authResponse.searchParams.get("error_description") ?? error
    );
  }

  const tokenURL = new URL(urljoin(host, "/services/oauth2/token"));
  const { data, status, statusText } = await axios.post(
    tokenURL.toString(),
    {},
    {
      params: {
        redirect_uri,
        grant_type: "authorization_code",
        code: authResponse.searchParams.get("code"),
        ...params,
      },
    }
  );

  if (status >= 400) {
    throw new Error(statusText);
  }

  await setCachedAuthData(auth.id, data);

  return data as AuthData;
}
