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
import { connectDevtools } from "@/devTools/protocol";
import {
  detectFrameworks,
  getTabInfo,
  injectScript,
  awaitPermissions,
  waitNavigation,
} from "@/background/devtools";
import useAsyncEffect from "use-async-effect";
import { useAsyncState } from "@/hooks/common";
import { FrameworkMeta } from "@/messaging/constants";
import { reportError } from "@/telemetry/logging";

interface FrameMeta {
  url: string;
  frameworks: FrameworkMeta[];
}

interface FrameConnectionState {
  frameId: number;

  /**
   * Sequence number for the frameId
   */
  navSequence: number;

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

const initialFrameState: Omit<FrameConnectionState, "frameId"> = {
  navSequence: 0,
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
   * The background page port.
   */
  port: Runtime.Port | null;

  /**
   * Error message when connecting to the background page.
   */
  portError?: string;

  tabState: FrameConnectionState;
}

const initialValue: Context = {
  connect: () => Promise.resolve(),
  port: null,
  portError: undefined,
  tabState: { ...initialFrameState, frameId: 0 },
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

class PermissionsError extends Error {
  constructor(msg: string) {
    super(msg);
    // Set the prototype explicitly.
    Object.setPrototypeOf(this, PermissionsError.prototype);
  }
}

async function connectToFrame(port: Runtime.Port): Promise<FrameMeta> {
  const { url, hasPermissions } = await getTabInfo(port);
  if (!hasPermissions) {
    console.debug(`connectToFrame: no access to ${url}`);
    throw new PermissionsError(`No access to URL: ${url}`);
  }
  console.debug(`connectToFrame: ensuring contentScript for ${url}`);
  await injectScript(port, { file: "contentScript.js" });
  console.debug(`connectToFrame: detecting frameworks on ${url}`);
  const frameworks = await detectFrameworks(port);
  console.debug(`connectToFrame: finished for ${url}`);
  return { frameworks, url };
}

export function useDevConnection(): Context {
  const [port, , portError] = useAsyncState(connectDevtools, []);
  const navSequence = useNavSequence(port);
  const [current, setCurrent] = useState<FrameConnectionState>({
    ...initialFrameState,
    frameId: 0,
    navSequence,
  });
  // connectSeq is used to fake recursive calls to connect
  const [connectSeq, setConnectSeq] = useState(0);

  const connect = useCallback(
    async (nav: number) => {
      if (!port) {
        throw new Error("background port not initialized");
      }
      const common = { frameId: 0, navSequence: nav };
      try {
        console.debug(`useDevConnection.connect: connecting for ${nav}`);
        const meta = await connectToFrame(port);
        console.debug(
          `useDevConnection.connect: replacing tabState for ${nav}: ${meta.url}`
        );
        setCurrent({
          ...common,
          hasPermissions: true,
          meta,
        });
      } catch (err) {
        if (err instanceof PermissionsError) {
          setCurrent({
            ...common,
            hasPermissions: false,
            meta: undefined,
          });
          awaitPermissions(port).then(() => {
            setConnectSeq((prev) => prev + 1);
          });
        } else {
          reportError(err);
          setCurrent({
            ...common,
            hasPermissions: true,
            meta: undefined,
            error: err.message?.toString() ?? err.toString(),
          });
        }
      }
    },
    [port, setCurrent, setConnectSeq]
  );

  const externalConnect = useCallback(async () => {
    await connect(navSequence);
  }, [connect, navSequence]);

  // automatically connect on when background port connected, and on future navigations
  useAsyncEffect(async () => {
    if (port) {
      await connect(navSequence);
    }
  }, [connectSeq, navSequence, port]);

  return {
    port,
    connect: externalConnect,
    portError: portError?.toString(),
    tabState: current,
  };
}
