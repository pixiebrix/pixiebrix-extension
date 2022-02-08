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
import { navigationEvent } from "@/devTools/events";
import { useAsyncEffect } from "use-async-effect";
import { FrameworkMeta } from "@/messaging/constants";
import { reportError } from "@/telemetry/rollbar";
import { uuidv4 } from "@/types/helpers";
import { useTabEventListener } from "@/hooks/events";
import { getErrorMessage, isErrorObject } from "@/errors";
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
   * True if the a connection attempt is in process
   */
  connecting: boolean;

  tabState: FrameConnectionState;
}

const initialValue: Context = {
  connecting: false,
  tabState: { ...initialFrameState, frameId: 0 },
};

export const DevToolsContext = React.createContext(initialValue);

async function connectToFrame(): Promise<FrameConnectionState> {
  const uuid = uuidv4();
  const common = { ...initialFrameState, navSequence: uuid };

  console.debug(`connectToFrame: connecting for ${uuid}`);
  if (!(await canAccessTab(thisTab))) {
    console.debug("connectToFrame: cannot access tab");
    return common;
  }

  console.debug("connectToFrame: ensuring contentScript");
  const firstTimeout = Symbol("firstTimeout");
  const contentScript = ensureContentScript(thisTab, 15_000);
  const result = await Promise.race([
    sleep(4000).then(() => firstTimeout),
    contentScript,
  ]);

  if (result === firstTimeout) {
    return {
      ...common,
      hasPermissions: true,
      error:
        "The Page Editor could not establish a connection to the page, retrying…",
    };
  }

  try {
    await contentScript;
  } catch (error) {
    const errorMessage =
      isErrorObject(error) && error.name === "TimeoutError"
        ? "The Page Editor could not establish a connection to the page"
        : getErrorMessage(error);
    reportError(error);
    return {
      ...common,
      hasPermissions: true,
      error: errorMessage,
    };
  }

  let frameworks: FrameworkMeta[] = [];
  try {
    console.debug("connectToFrame: detecting frameworks");
    frameworks = await pTimeout(detectFrameworks(thisTab, null), 500);
  } catch (error) {
    console.debug("connectToFrame: error detecting frameworks", {
      error,
    });
  }

  console.debug(`connectToFrame: replacing tabState for ${uuid}`);
  return {
    ...common,
    hasPermissions: true,
    meta: { frameworks },
  };
}

export function useDevConnection(): Context {
  const { tabId } = browser.devtools.inspectedWindow;

  const [connecting, setConnecting] = useState(false);

  const [lastUpdate, setLastUpdate] = useState(Date.now());

  const [tabState, setTabState] = useState<FrameConnectionState>(
    initialFrameState
  );

  const connect = useCallback(async () => {
    setLastUpdate(Date.now());
  }, []);

  // Automatically connect on load
  useAsyncEffect(
    async (isActive) => {
      setConnecting(true);
      const tabState = await connectToFrame();
      setConnecting(false);
      if (isActive()) {
        setTabState(tabState);
      }
    },
    [lastUpdate]
  );

  useTabEventListener(tabId, navigationEvent, connect);

  return {
    connecting,
    tabState,
  };
}
