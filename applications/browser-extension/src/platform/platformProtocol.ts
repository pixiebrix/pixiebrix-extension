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

import type { PlatformCapability } from "@/platform/capabilities";
import type { SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import type { NetworkRequestConfig } from "@/types/networkTypes";
import type { RemoteResponse } from "@/types/contract";
import type { Nullishable } from "@/utils/nullishUtils";
import type { FormDefinition } from "@/platform/forms/formTypes";
import type { SemVerString } from "@/types/registryTypes";
import type { JavaScriptPayload } from "@/sandbox/messenger/api";
import type { Logger } from "@/types/loggerTypes";
import type { AudioProtocol } from "@/platform/platformTypes/audioProtocol";
import type { ClipboardProtocol } from "@/platform/platformTypes/clipboardProtocol";
import type { ContextMenuProtocol } from "@/platform/platformTypes/contextMenuProtocol";
import type { BadgeProtocol } from "@/platform/platformTypes/badgeProtocol";
import type { ToastProtocol } from "@/platform/platformTypes/toastProtocol";
import type { DebuggerProtocol } from "@/platform/platformTypes/debuggerProtocol";
import type { StateProtocol } from "@/platform/platformTypes/stateProtocol";
import type { TemplateProtocol } from "@/platform/platformTypes/templateProtocol";
import type { SnippetShortcutMenuProtocol } from "@/platform/platformTypes/snippetShortcutMenuProtocol";
import type { TextSelectionMenuProtocol } from "@/platform/platformTypes/textSelectionMenuProtocol";
import type { PanelProtocol } from "@/platform/platformTypes/panelProtocol";
import type { QuickBarProtocol } from "@/platform/platformTypes/quickBarProtocol";
import type { ModComponentRef } from "@/types/modComponentTypes";
import type { CaptureProtocol } from "@/platform/platformTypes/captureProtocol";
import type { RegistryProtocol } from "@/platform/platformTypes/registryProtocol";

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
   * The platform name.
   */
  readonly platformName: string;

  /**
   * The platform version. For the extension, corresponds to the extension version.
   */
  readonly version: SemVerString;

  /**
   * The capabilities of the platform. Used for static analysis of mods.
   */
  readonly capabilities: readonly PlatformCapability[];

  /**
   * Open a URL. On the web, typically opens in a new tab.
   * @since 1.8.10
   */
  open: (url: URL) => Promise<void>;

  /**
   * Show a blocking alert.
   * @since 1.8.10
   */
  alert: typeof window.alert;

  /**
   * Show a blocking prompt.
   * @since 1.8.10
   */
  prompt: typeof window.prompt;

  /**
   * Show an ephemeral form.
   * @since 1.8.10
   */
  form: (
    definition: FormDefinition,
    controller: AbortController,
    modComponentRef: ModComponentRef,
  ) => Promise<unknown>;

  /**
   * Run sandboxed Javascript. Does not have access to the DOM.
   * @since 1.8.10
   * @param code the function to run
   * @param data the data to pass to the function
   */
  runSandboxedJavascript: (args: JavaScriptPayload) => Promise<unknown>;

  /**
   * Perform a (potentially-authenticated) API request.
   * @since 1.8.10
   */
  request: <TData>(
    integrationConfig: Nullishable<SanitizedIntegrationConfig>,
    requestConfig: NetworkRequestConfig,
  ) => Promise<RemoteResponse<TData>>;

  /**
   * The package registry protocol for the platform.
   */
  get registry(): RegistryProtocol;

  /**
   * The runtime logger for the platform.
   * @since 1.8.10
   */
  get logger(): Logger;

  /**
   * The context menu protocol for the platform.
   * @since 1.8.10
   */
  get contextMenus(): ContextMenuProtocol;

  /**
   * The audio protocol for the platform.
   * @since 1.8.10
   */
  get audio(): AudioProtocol;

  /**
   * The audio/screen capture protocol for the platform.
   * @since 2.0.7
   */
  get capture(): CaptureProtocol;

  /**
   * The clipboard protocol for the platform.
   * @since 1.8.10
   */
  get clipboard(): ClipboardProtocol;

  /**
   * The variable store/state for the platform. Generalizes "page state" to context without a page.
   * @since 1.8.10
   */
  get state(): StateProtocol;

  /**
   * The template engines for the platform.
   * @since 1.8.10
   */
  get templates(): TemplateProtocol;

  /**
   * The registry for the quick bar.
   * @since 1.8.10
   */
  get quickBar(): QuickBarProtocol;

  /**
   * The registry for the text selection menu.
   * @since 1.8.10
   */
  get textSelectionMenu(): TextSelectionMenuProtocol;

  /**
   * The registry for the text editor command popover.
   * @since 1.8.10
   */
  get snippetShortcutMenu(): SnippetShortcutMenuProtocol;

  /**
   * Protocol for showing notification toasts to the user
   * @since 1.8.10
   */
  get toasts(): ToastProtocol;

  /**
   * Protocol for showing panels to the user
   * @since 1.8.10
   */
  get panels(): PanelProtocol;

  /**
   * Protocol for debugging/tracing mods.
   * @since 1.8.10
   */
  get debugger(): DebuggerProtocol;

  /**
   * The badge, e.g., the toolbar icon in a web extension.
   * @since 1.8.10
   */
  get badge(): BadgeProtocol;
}
