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

  const connect = useCallback(async () => {
    const backgroundPort = await connectDevtools();
    const { hasPermissions } = await getTabInfo(backgroundPort);

    if (!hasPermissions) {
      setContext({
        port: backgroundPort,
        frameworks: [],
        hasTabPermissions: false,
      });
      return;
    }

    await injectScript(backgroundPort, { file: "contentScript.js" });
    try {
      const frameworks = await detectFrameworks(backgroundPort);
      setContext({ port: backgroundPort, frameworks, hasTabPermissions: true });
    } catch (reason) {
      if (reason.message?.includes("Receiving end does not exist")) {
        setContext({
          port: backgroundPort,
          frameworks: [],
          hasTabPermissions: false,
        });
      } else {
        setContext({
          port: backgroundPort,
          frameworks: [],
          hasTabPermissions: false,
          error: reason,
        });
      }
    }
  }, [setContext]);

  useAsyncEffect(async () => await connect(), []);

  return [context, connect];
}
