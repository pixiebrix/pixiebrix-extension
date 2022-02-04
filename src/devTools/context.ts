import { getErrorMessage, isErrorObject } from "@/errors";
/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import React, { useCallback, useState } from "react";
import pTimeout from "p-timeout";
import browser from "webextension-polyfill";
import { navigationEvent } from "@/background/devtools/external";
import { useAsyncEffect } from "use-async-effect";
import { FrameworkMeta } from "@/messaging/constants";
import { reportError } from "@/telemetry/logging";
import { uuidv4 } from "@/types/helpers";
import { useTabEventListener } from "@/hooks/events";
import { thisTab } from "@/devTools/utils";
import { detectFrameworks } from "@/contentScript/messenger/api";
import { ensureContentScript } from "@/background/messenger/api";
import { canAccessTab } from "webext-tools";
import { sleep } from "@/utils";

interface FrameMeta {
  frameworks: FrameworkMeta[];
}

export interface FrameConnectionState {
  frameId: number;

  /**
   * UUID for the navigation result
   */
  navSequence: string | undefined;

  /**
   * True if the devtools have permission to access the current tab
   */
  hasPermissions: boolean;

  /**
   * Error message when connecting to the page
   */
  error?: string;

  meta: FrameMeta | undefined;
}

const initialFrameState: FrameConnectionState = {
  navSequence: undefined,
  hasPermissions: false,
  error: undefined,
  meta: undefined,
  frameId: 0,
};

export interface Context {
  /**
   * Re-connect to the background page
   */
  connect: () => Promise<void>;

  /**
   * True if the a connection attempt is in process
   */
  connecting: boolean;

  tabState: FrameConnectionState;
}

const initialValue: Context = {
  connect: async () => {},
  connecting: false,
  tabState: { ...initialFrameState, frameId: 0 },
};

export const DevToolsContext = React.createContext(initialValue);

export function useDevConnection(): Context {
  const { tabId } = browser.devtools.inspectedWindow;

  const [connecting, setConnecting] = useState(false);

  const [tabState, setTabState] = useState<FrameConnectionState>(
    initialFrameState
  );

  const connect = useCallback(async () => {
    const uuid = uuidv4();
    const common = { ...initialFrameState, navSequence: uuid };
    setConnecting(true);

    console.debug(`useDevConnection.connect: connecting for ${uuid}`);
    if (!(await canAccessTab(thisTab))) {
      setTabState(common);
      return;
    }

    console.debug("useDevConnection.connect: ensuring contentScript");
    const firstTimeout = Symbol("firstTimeout");
    const contentScript = ensureContentScript(thisTab, 15_000);
    const result = await Promise.race([
      sleep(4000).then(() => firstTimeout),
      contentScript,
    ]);

    if (result === firstTimeout) {
      setTabState({
        ...common,
        hasPermissions: true,
        error:
          "The Page Editor could not establish a connection to the page, retrying…",
      });
    }

    try {
      await contentScript;
    } catch (error) {
      const errorMessage =
        isErrorObject(error) && error.name === "TimeoutError"
          ? "The Page Editor could not establish a connection to the page"
          : getErrorMessage(error);
      reportError(error);
      setTabState({
        ...common,
        hasPermissions: true,
        error: errorMessage,
      });
      return;
    }

    let frameworks: FrameworkMeta[] = [];
    try {
      console.debug("useDevConnection.connect: detecting frameworks");
      frameworks = await pTimeout(detectFrameworks(thisTab, null), 500);
    } catch (error) {
      console.debug("useDevConnection.connect: error detecting frameworks", {
        error,
      });
    }

    console.debug(`useDevConnection.connect: replacing tabState for ${uuid}`);
    setTabState({
      ...common,
      hasPermissions: true,
      meta: { frameworks },
    });

    setConnecting(false);
  }, [setTabState]);

  // Automatically connect on load
  useAsyncEffect(async () => {
    await connect();
  }, []);

  useTabEventListener(tabId, navigationEvent, connect);

  return {
    connecting,
    connect,
    tabState,
  };
}
