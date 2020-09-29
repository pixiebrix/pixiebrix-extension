import { useEffect, useState } from "react";
import useAsyncEffect from "use-async-effect";
import { sendTabMessage } from "@/messaging/chrome";
import { SEARCH_WINDOW } from "@/messaging/constants";

export function useContentScript(portName, listener) {
  const [port, setPort] = useState();

  useEffect(() => {
    const tabId = chrome.devtools.inspectedWindow.tabId;
    console.debug(`Connecting on port ${portName}`);
    const port = chrome.tabs.connect(tabId, { name: portName });

    port.onDisconnect.addListener(() => {
      console.log(`Console script disconnected from ${portName}`);
      setPort(undefined);
    });

    setPort(port);

    return function cleanup() {
      if (port) {
        port.disconnect();
      }
    };
  }, [portName]);

  useEffect(() => {
    if (port && listener) {
      console.debug("Attached port listener");
      port.onMessage.addListener(listener);
    } else {
      console.debug("Not attaching port listener -- port not attached yet");
    }
    return function cleanup() {
      if (port && listener) {
        port.onMessage.removeListener(listener);
      }
    };
  }, [port, listener]);

  return port;
}

export function useTabInfo(messageType) {
  const [result, setResult] = useState(undefined);
  const [error, setError] = useState();

  useAsyncEffect(
    async (isMounted) => {
      setError(undefined);
      setResult(undefined);

      const tabId = chrome.devtools.inspectedWindow.tabId;
      try {
        const result = await sendTabMessage(tabId, { type: messageType });
        if (!isMounted()) return;
        setResult(result);
      } catch (exc) {
        if (!isMounted()) return;
        setError(exc);
        setResult(undefined);
      }
    },
    [messageType]
  );

  return [result, error];
}

export function useSearchWindow(query) {
  const [results, setResults] = useState([]);
  const [error, setError] = useState();

  useAsyncEffect(
    async (isMounted) => {
      if (!query) return;
      setError(undefined);
      setResults(undefined);
      const tabId = chrome.devtools.inspectedWindow.tabId;
      try {
        const { results } = await sendTabMessage(tabId, {
          type: SEARCH_WINDOW,
          query,
        });
        if (!isMounted()) return;
        setResults(results);
      } catch (exc) {
        if (!isMounted()) return;
        setError(exc);
        setResults([]);
      }
    },
    [query]
  );

  return [results, error];
}
