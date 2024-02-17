/*
 * Copyright (C) 2024 PixieBrix, Inc.
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

import type { showNotification } from "@/utils/notify";
import type { UnknownObject } from "@/types/objectTypes";
import {
  type PlatformCapability,
  PlatformCapabilityNotAvailable,
} from "@/platform/capabilities";
import type { getState, setState } from "@/platform/state/pageState";
import type { QuickBarRegistryProtocol } from "@/components/quickBar/quickBarRegistry";
import type { ElementReference } from "@/types/runtimeTypes";
import type { SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import type { AxiosRequestConfig } from "axios";
import type { RemoteResponse } from "@/types/contract";
import type { Nullishable } from "@/utils/nullishUtils";

function notAvailable(capability: PlatformCapability): () => never {
  return () => {
    throw new PlatformCapabilityNotAvailable(capability);
  };
}

/**
 * The variable store/state for the platform. Formerly known as the "page state".
 */
type State = {
  /**
   * Get the current state.
   */
  getState: typeof getState;

  /**
   * Set the current state.
   */
  setState: typeof setState;
};

/**
 * A protocol for the platform/environment running the mods.
 *
 * The goal is to provide a clear abstraction between bricks and the platform they are running.
 *
 * For example:
 * - Web Extension: has access to Web APIs, web extension APIs, and has access to a target page DOM.
 *   Can only run sandboxed Javascript, due to MV3 remote code restrictions.
 * - Web App: has access to Web APIs
 */
export interface PlatformProtocol {
  /**
   * The capabilities of the platform. Used for static analysis of mods.
   */
  readonly capabilities: readonly PlatformCapability[];

  /**
   * Show a blocking alert.
   */
  alert: typeof window.alert;

  /**
   * Show a blocking prompt.
   */
  prompt: typeof window.prompt;

  /**
   * Show a non-blocking notification.
   */
  notify: typeof showNotification;

  /**
   * Set the badge text for the platform, e.g., the browser extension icon badge or tab favicon badge.
   */
  setBadgeText: (text: string) => void;

  /**
   * Run sandboxed Javascript. Does not have access to the DOM.
   * @param code the function to run
   * @param data the data to pass to the function
   */
  runSandboxedJavascript: (
    code: string,
    data: UnknownObject,
  ) => Promise<unknown>;

  /**
   * Play a sound effect.
   * @param sound
   */
  playSound: (sound: string) => Promise<void>;

  /**
   * Prompt the user to select one or more elements on a host page.
   */
  userSelectElementRefs: () => Promise<ElementReference[]>;

  /**
   * Perform an API request.
   */
  request: <TData>(
    integrationConfig: Nullishable<SanitizedIntegrationConfig>,
    requestConfig: AxiosRequestConfig,
  ) => Promise<RemoteResponse<TData>>;

  /**
   * The variable store/state for the platform. Formerly known as the "page state".
   */
  get state(): State;

  /**
   * The registry for the quick bar.
   */
  get quickBarRegistry(): QuickBarRegistryProtocol;
}

export class PlatformABC implements PlatformProtocol {
  readonly capabilities: readonly PlatformCapability[] = [];

  alert: PlatformProtocol["alert"] = notAvailable("alert");

  prompt: PlatformProtocol["prompt"] = notAvailable("alert");

  notify: PlatformProtocol["notify"] = notAvailable("toast");

  runSandboxedJavascript: PlatformProtocol["runSandboxedJavascript"] =
    notAvailable("sandbox");

  playSound: PlatformProtocol["playSound"] = notAvailable("audio");

  setBadgeText: PlatformProtocol["setBadgeText"] = notAvailable("icon");

  userSelectElementRefs: PlatformProtocol["userSelectElementRefs"] =
    notAvailable("contentScript");

  request: PlatformProtocol["request"] = notAvailable("http");

  get state(): State {
    throw new PlatformCapabilityNotAvailable("state");
  }

  get quickBarRegistry(): QuickBarRegistryProtocol {
    throw new PlatformCapabilityNotAvailable("quickBar");
  }
}

/**
 * A platform protocol with no available capabilities.
 */
export const unavailablePlatform = new PlatformABC();
