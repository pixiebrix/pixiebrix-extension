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
import {
  type PlatformCapability,
  PlatformCapabilityNotAvailable,
} from "@/platform/capabilities";
import type { getState, setState } from "@/platform/state/stateController";
import type { QuickBarRegistryProtocol } from "@/components/quickBar/quickBarRegistry";
import type { ElementReference } from "@/types/runtimeTypes";
import type { SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import type { AxiosRequestConfig } from "axios";
import type { RemoteResponse } from "@/types/contract";
import type { Nullishable } from "@/utils/nullishUtils";
import type { FormDefinition } from "@/platform/forms/formTypes";
import type { UUID } from "@/types/stringTypes";
import type { RegistryId } from "@/types/registryTypes";
import type { JsonObject } from "type-fest";
import type { TemporaryPanelDefinition } from "@/platform/panels/panelTypes";
import type { JavaScriptPayload } from "@/sandbox/messenger/api";

function notAvailable(capability: PlatformCapability): () => never {
  return () => {
    throw new PlatformCapabilityNotAvailable(capability);
  };
}

/**
 * The variable store/state for the platform. Formerly known as the "page state".
 */
export type StateProtocol = {
  /**
   * Get the current state.
   */
  getState: typeof getState;

  /**
   * Set the current state.
   */
  setState: typeof setState;
};

export type TemplateProtocol = {
  render: (args: {
    engine: "nunjucks" | "handlebars";
    template: string;
    context: JsonObject;
    autoescape: boolean;
  }) => Promise<string>;

  // Must also provide a "validate" because nunjucks uses function constructor for compiling the template
  validate: (args: { engine: "nunjucks"; template: string }) => Promise<void>;
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
   * Show an ephemeral form.
   */
  form: (
    definition: FormDefinition,
    controller: AbortController,
    context: { componentId: UUID; modId?: RegistryId },
  ) => Promise<unknown>;

  /**
   * Show an ephemeral panel.
   * @param definition
   */
  panel: (definition: TemporaryPanelDefinition) => Promise<JsonObject>;

  /**
   * Set the badge text for the platform, currently the toolbar icon.
   */
  setBadgeText: (text: string) => void;

  /**
   * Run sandboxed Javascript. Does not have access to the DOM.
   * @param code the function to run
   * @param data the data to pass to the function
   */
  runSandboxedJavascript: (args: JavaScriptPayload) => Promise<unknown>;

  /**
   * Play a sound effect.
   * @param sound
   */
  playSound: (sound: string) => Promise<void>;

  /**
   * Prompt the user to select one or more elements on a host page.
   */
  // XXX: this method only makes sense in the context of a content script. We might choose to exclude it from
  // the platform protocol.
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
  get state(): StateProtocol;

  /**
   * The template engines for the platform.
   */
  get template(): TemplateProtocol;

  /**
   * The registry for the quick bar.
   */
  get quickBar(): QuickBarRegistryProtocol;
}

export class PlatformABC implements PlatformProtocol {
  readonly capabilities: readonly PlatformCapability[] = [];

  alert: PlatformProtocol["alert"] = notAvailable("alert");

  prompt: PlatformProtocol["prompt"] = notAvailable("alert");

  notify: PlatformProtocol["notify"] = notAvailable("toast");

  playSound: PlatformProtocol["playSound"] = notAvailable("audio");

  setBadgeText: PlatformProtocol["setBadgeText"] = notAvailable("icon");

  userSelectElementRefs: PlatformProtocol["userSelectElementRefs"] =
    notAvailable("contentScript");

  request: PlatformProtocol["request"] = notAvailable("http");

  form: PlatformProtocol["form"] = notAvailable("form");

  panel: PlatformProtocol["panel"] = notAvailable("panel");

  runSandboxedJavascript: PlatformProtocol["runSandboxedJavascript"] =
    notAvailable("sandbox");

  get state(): StateProtocol {
    throw new PlatformCapabilityNotAvailable("state");
  }

  get template(): TemplateProtocol {
    throw new PlatformCapabilityNotAvailable("template");
  }

  get quickBar(): QuickBarRegistryProtocol {
    throw new PlatformCapabilityNotAvailable("quickBar");
  }
}

/**
 * A platform protocol with no available capabilities.
 */
export const uninitializedPlatform = new PlatformABC();
