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
import { getErrorMessage } from "@/errors";
import { thisTab } from "@/devTools/utils";
import { Except } from "type-fest";
import { detectFrameworks } from "@/contentScript/messenger/api";
import { ensureContentScript } from "@/background/messenger/api";
import { canAccessTab } from "webext-tools";

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

const initialFrameState: Except<FrameConnectionState, "frameId"> = {
  navSequence: undefined,
  hasPermissions: false,
  error: undefined,
  meta: undefined,
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

class PermissionsError extends Error {
  constructor(message: string) {
    super(message);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, PermissionsError.prototype);
  }
}

async function connectToFrame(): Promise<FrameMeta> {
  console.debug("connectToFrame: ensuring contentScript");
  try {
    await pTimeout(
      ensureContentScript(thisTab),
      4000,
      "The Page Editor could not establish a connection to the page"
    );
  } catch (error) {
    // If it's not a permission error, then throw error as is
    if (await canAccessTab(thisTab)) {
      throw error;
    }

    console.debug("connectToFrame: no access to host");
    throw new PermissionsError("No access to URL");
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

  console.debug("connectToFrame: finished");
  return { frameworks };
}

export function useDevConnection(): Context {
  const { tabId } = browser.devtools.inspectedWindow;

  const [connecting, setConnecting] = useState(false);

  const [current, setCurrent] = useState<FrameConnectionState>({
    ...initialFrameState,
    frameId: 0,
  });

  const connect = useCallback(async () => {
    const uuid = uuidv4();
    const common = { frameId: 0, navSequence: uuid };
    try {
      console.debug(`useDevConnection.connect: connecting for ${uuid}`);
      setConnecting(true);
      const meta = await connectToFrame();
      console.debug(`useDevConnection.connect: replacing tabState for ${uuid}`);
      setCurrent({
        ...common,
        hasPermissions: true,
        meta,
      });
    } catch (error) {
      if (error instanceof PermissionsError) {
        setCurrent({
          ...common,
          hasPermissions: false,
          meta: undefined,
        });
      } else {
        reportError(error);
        setCurrent({
          ...common,
          hasPermissions: true,
          meta: undefined,
          error: getErrorMessage(error),
        });
      }
    }

    setConnecting(false);
  }, [setCurrent]);

  // Automatically connect on load
  useAsyncEffect(async () => {
    await connect();
  }, []);

  useTabEventListener(tabId, navigationEvent, connect);

  return {
    connecting,
    connect,
    tabState: current,
  };
}
