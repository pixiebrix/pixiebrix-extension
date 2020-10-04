import { useState } from "react";
import useAsyncEffect from "use-async-effect";
import axios from "axios";
import { getBaseURL } from "@/services/baseService";
import { useAsyncState } from "@/hooks/common";
import { useToasts } from "react-toast-notifications";

function isAbsoluteURL(url: string): boolean {
  return url.indexOf("http://") === 0 || url.indexOf("https://") === 0;
}

export async function makeURL(relativeOrAbsoluteUrl: string): Promise<string> {
  return isAbsoluteURL(relativeOrAbsoluteUrl)
    ? relativeOrAbsoluteUrl
    : joinURL(await getBaseURL(), relativeOrAbsoluteUrl);
}

function joinURL(host: string, relativeUrl: string): string {
  const cleanHost = host.replace(/\/$/, "");
  const cleanPath = relativeUrl.replace(/^\//, "");
  return `${cleanHost}/${cleanPath}`;
}

export async function fetch<TData>(
  relativeOrAbsoluteUrl: string
): Promise<TData> {
  const url = isAbsoluteURL(relativeOrAbsoluteUrl)
    ? relativeOrAbsoluteUrl
    : joinURL(await getBaseURL(), relativeOrAbsoluteUrl);

  const { data } = await axios.get<TData>(url);

  return data;
}

/**
 * Hook for fetching information from a URL.
 * @param relativeOrAbsoluteUrl
 */
export function useFetch<TData>(
  relativeOrAbsoluteUrl: string
): TData | undefined {
  const [host] = useAsyncState(getBaseURL);
  const { addToast } = useToasts();
  const [data, setData] = useState<TData>();

  useAsyncEffect(
    async (isMounted) => {
      if (host) {
        const url = isAbsoluteURL(relativeOrAbsoluteUrl)
          ? relativeOrAbsoluteUrl
          : joinURL(host, relativeOrAbsoluteUrl);

        setData(undefined);
        try {
          const { data } = await axios.get<TData>(url);
          if (!isMounted()) return;
          setData(data);
        } catch (ex) {
          console.exception(ex);
          if (isMounted()) {
            addToast(`An error occurred fetching data from the server`, {
              appearance: "error",
              autoDismiss: true,
            });
          }
        }
      }
    },
    [host, relativeOrAbsoluteUrl, setData]
  );

  return data;
}
