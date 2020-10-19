import axios from "axios";
import { readStorage, setStorage } from "@/chrome";
import { isBackgroundPage } from "webext-detect-page";
import { IService, OAuthData, RawServiceConfiguration } from "@/core";
import urljoin from "url-join";

const OAUTH2_STORAGE_KEY = "OAUTH2";

async function setCachedOAuth2(
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

export async function getCachedOAuth2<T extends OAuthData>(
  key: string
): Promise<T> {
  if (!isBackgroundPage()) {
    throw new Error("Only the background page can access oauth2 information");
  }
  const current = JSON.parse((await readStorage(OAUTH2_STORAGE_KEY)) ?? "{}");
  return current[key];
}

export async function deleteCachedOAuth2(key: string): Promise<void> {
  if (!isBackgroundPage()) {
    throw new Error("Only the background page can access oauth2 information");
  }
  const current = JSON.parse((await readStorage(OAUTH2_STORAGE_KEY)) ?? "{}");
  delete current[key];
  await setStorage(OAUTH2_STORAGE_KEY, JSON.stringify(current));
}

async function launchWebAuthFlow(url: string): Promise<string> {
  console.debug("launchWebAuthFlow", { url });
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      { url, interactive: true },
      (responseUrl) => {
        if (chrome.runtime.lastError != null) {
          reject(
            new Error(
              `Unable to launch web auth flow: ${chrome.runtime.lastError.message}`
            )
          );
        } else {
          resolve(responseUrl);
        }
      }
    );
  });
}

export async function launchOAuth2Flow(
  service: IService,
  auth: RawServiceConfiguration
): Promise<OAuthData> {
  // reference: https://github.com/kylpo/salesforce-chrome-oauth/blob/master/index.js
  if (!service.isOAuth2) {
    throw new Error(`Service ${service.id} is not an OAuth2 service`);
  }

  const oauth2 = await service.getOAuth2Context(auth.config);
  console.debug("OAuth2 context", oauth2);
  const { host, ...params } = oauth2;

  const redirect_uri = chrome.identity.getRedirectURL("oauth2");

  const authorizeURL = new URL(urljoin(host, "/services/oauth2/authorize"));
  for (const [key, value] of Object.entries({
    redirect_uri,
    response_type: "code",
    display: "page",
    ...params,
  })) {
    authorizeURL.searchParams.set(key, value);
  }

  const responseUrl = await launchWebAuthFlow(authorizeURL.toString());

  if (!responseUrl) {
    throw new Error("Authentication cancelled");
  }

  console.debug("auth responseUrl", responseUrl);

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

  console.debug("token response data", data);

  await setCachedOAuth2(auth.id, data);

  return data as OAuthData;
}
