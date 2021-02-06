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

import React, { useState, useCallback } from "react";
import { browser, Runtime } from "webextension-polyfill-ts";
import { FrameworkMeta } from "@/messaging/constants";
import { connectDevtools } from "@/devTools/protocol";
import {
  detectFrameworks,
  getTabInfo,
  injectScript,
  awaitPermissions,
  waitNavigation,
} from "@/background/devtools";
import useAsyncEffect from "use-async-effect";

export interface Context {
  /**
   * Reconnect to the page
   */
  connect: () => Promise<void>;

  /**
   * The background page port.
   */
  port: Runtime.Port | null;

  /**
   * True if the devtools have permission to access the current tab
   */
  hasTabPermissions: boolean;

  /**
   * True if the page script has been injected for the current page
   */
  ready: boolean;

  /**
   * Nav sequence number for top-level frame
   */
  navSequence: number;

  /**
   * Frameworks detected on the tab.
   */
  frameworks: FrameworkMeta[];

  /**
   * Error message if an error occurred when connecting to the page.
   */
  error?: string;
}

const initialValue: Context = {
  connect: () => Promise.resolve(),
  port: null,
  navSequence: 0,
  ready: false,
  hasTabPermissions: false,
  frameworks: [],
  error: null,
};

export const DevToolsContext = React.createContext(initialValue);

/**
 * Returns a monotonically increasing number whenever the inspected page has a navigation event.
 */
export function useNavSequence(port: Runtime.Port): number {
  const tabId = browser.devtools.inspectedWindow.tabId;
  const [seq, setSeq] = useState(0);

  useAsyncEffect(
    async (isMounted) => {
      if (port) {
        const details = await waitNavigation(port, tabId);
        console.debug(`Target page navigated: ${details?.url}`, { details });

        if (!isMounted()) {
          return;
        }

        setSeq((prevState) => prevState + 1);
      }
    },
    [tabId, seq, setSeq, port]
  );

  return seq;
}

export function useDevConnection(): Context {
  const [context, setContext] = useState<
    Omit<Context, "connect" | "navSequence">
  >(initialValue);

  // setConnectSequence and navSequence is used to trigger re-connect
  const navSequence = useNavSequence(context.port);
  const [connectSequence, setConnectSequence] = useState(0);

  const connect = useCallback(async () => {
    let port: Runtime.Port;
    let error: string = null;

    setContext((prevState) => ({
      ...prevState,
      ready: false,
      frameworks: [],
      hasTabPermissions: false,
      error: null,
    }));

    try {
      console.debug("useMakeContext:connectDevtools");
      port = await connectDevtools();
      setContext((prevState) => ({ ...prevState, port }));
    } catch (err) {
      setContext({
        port: null,
        ready: false,
        frameworks: [],
        hasTabPermissions: null,
        error: err.toString(),
      });
      return;
    }

    let hasTabPermissions: boolean;
    try {
      console.debug("useMakeContext:getTabInfo");
      hasTabPermissions = (await getTabInfo(port)).hasPermissions;
      setContext((prevState) => ({ ...prevState, hasTabPermissions: true }));
    } catch (reason) {
      hasTabPermissions = false;
      error = reason.toString();
      setContext((prevState) => ({
        ...prevState,
        hasTabPermissions: false,
        error,
      }));
    }

    if (!hasTabPermissions) {
      awaitPermissions(port).then(() => {
        setConnectSequence((prev) => prev + 1);
      });
      console.debug(
        "Scheduling automatic re-connect once permissions granted",
        { error }
      );
      return;
    }

    try {
      await injectScript(port, { file: "contentScript.js" });
      setContext((prevState) => ({ ...prevState, ready: true, error: null }));
      console.debug("useMakeContext.injectScript: success");
    } catch (reason) {
      setContext((prevState) => ({
        ...prevState,
        ready: false,
        error: reason.toString(),
      }));
      console.debug("useMakeContext.injectScript: error", reason);
      return;
    }

    try {
      console.debug("useMakeContext:detectFrameworks");
      const frameworks = await detectFrameworks(port);
      setContext((prevState) => ({ ...prevState, frameworks }));
    } catch (reason) {
      if (reason?.message?.includes("Receiving end does not exist")) {
        setContext((prevState) => ({
          ...prevState,
          error: "Content script not initialized",
        }));
      } else {
        setContext((prevState) => ({
          ...prevState,
          error:
            reason?.message?.toString() ??
            reason.toString() ??
            "Unknown error detecting front-end frameworks",
        }));
      }
    }
  }, [setContext]);

  useAsyncEffect(connect, [connectSequence, navSequence]);

  return { ...context, navSequence, connect };
}
