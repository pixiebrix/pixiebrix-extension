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
import { Runtime } from "webextension-polyfill-ts";
import { FrameworkMeta } from "@/messaging/constants";
import { connectDevtools } from "@/devTools/protocol";
import {
  detectFrameworks,
  getTabInfo,
  injectScript,
  awaitPermissions,
} from "@/background/devtools";
import useAsyncEffect from "use-async-effect";

interface Context {
  /**
   * The background page port.
   */
  port: Runtime.Port | null;

  /**
   * True if the devtools have permission to access the current tab
   */
  hasTabPermissions: boolean;

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
  port: null,
  hasTabPermissions: false,
  frameworks: [],
  error: null,
};

export const DevToolsContext = React.createContext(initialValue);

export function useMakeContext(): [Context, () => Promise<void>] {
  const [context, setContext] = useState(initialValue);
  const [connectSequence, setConnectSequence] = useState(0);

  const connect = useCallback(async () => {
    let hasTabPermissions: boolean;
    let port: Runtime.Port;
    let error: unknown;

    try {
      console.debug("useMakeContext:connectDevtools");
      port = await connectDevtools();
    } catch (err) {
      setContext({
        port: null,
        frameworks: [],
        hasTabPermissions: null,
        error: err.toString(),
      });
      return;
    }

    try {
      console.debug("useMakeContext:getTabInfo");
      hasTabPermissions = (await getTabInfo(port)).hasPermissions;
    } catch (reason) {
      error = reason;
    }

    if (!hasTabPermissions) {
      setContext({
        port,
        frameworks: [],
        hasTabPermissions,
        error: error?.toString(),
      });

      awaitPermissions(port).then(() => {
        setConnectSequence((prev) => prev + 1);
      });

      return;
    }

    try {
      console.debug("useMakeContext:injectScript");
      await injectScript(port, { file: "contentScript.js" });
    } catch (reason) {
      setContext({
        port,
        frameworks: [],
        hasTabPermissions,
        error: reason.toString(),
      });
      return;
    }

    // ok so far
    setContext({ port, frameworks: [], hasTabPermissions, error: null });

    try {
      console.debug("useMakeContext:detectFrameworks");
      const frameworks = await detectFrameworks(port);
      setContext({ port, frameworks, hasTabPermissions, error: null });
    } catch (reason) {
      if (reason?.message?.includes("Receiving end does not exist")) {
        setContext({
          port,
          frameworks: [],
          hasTabPermissions,
          error: "Content script not initialized",
        });
      } else {
        setContext({
          port,
          frameworks: [],
          hasTabPermissions,
          error:
            reason?.message?.toString() ??
            reason.toString() ??
            "Unknown error detecting front-end frameworks",
        });
      }
    }
  }, [setContext]);

  useAsyncEffect(connect, [connectSequence]);

  return [context, connect];
}
