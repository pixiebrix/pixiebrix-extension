import isEmpty from "lodash/isEmpty";
import { readStorage, setStorage } from "@/chrome";
import useAsyncEffect from "use-async-effect";
import { useState, useCallback } from "react";

export const DEFAULT_SERVICE_URL = process.env.SERVICE_URL;
export const SERVICE_STORAGE_KEY = "service-url";

type ConfiguredHost = string | null | undefined;

function withoutTrailingSlash(url: string): string {
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export async function getBaseURL(): Promise<string> {
  if (chrome.storage) {
    const configured = (await readStorage(
      SERVICE_STORAGE_KEY
    )) as ConfiguredHost;
    return withoutTrailingSlash(
      isEmpty(configured) ? DEFAULT_SERVICE_URL : configured
    );
  } else {
    return withoutTrailingSlash(DEFAULT_SERVICE_URL);
  }
}

export async function setBaseURL(serviceURL: string): Promise<void> {
  await setStorage(SERVICE_STORAGE_KEY, serviceURL);
}

type ConfiguredHostResult = [ConfiguredHost, (url: string) => Promise<void>];

/**
 * Hook for retrieving/setting the manually configured host.
 */
export function useConfiguredHost(): ConfiguredHostResult {
  const [state, setState] = useState(undefined);

  useAsyncEffect(
    async (isMounted) => {
      const configured = await readStorage(SERVICE_STORAGE_KEY);
      if (!isMounted()) return;
      setState(configured);
    },
    [setState]
  );

  const setUrl = useCallback(
    async (url) => {
      await setBaseURL(url);
      setState(url);
    },
    [setState]
  );

  return [isEmpty(state) ? undefined : state, setUrl];
}
