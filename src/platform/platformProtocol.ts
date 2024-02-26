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

import {
  type PlatformCapability,
  PlatformCapabilityNotAvailable,
} from "@/platform/capabilities";
import type { getState, setState } from "@/platform/state/stateController";
import type { QuickBarRegistryProtocol } from "@/components/quickBar/quickBarRegistry";
import type { ElementReference, RunArgs } from "@/types/runtimeTypes";
import type { SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import type { AxiosRequestConfig } from "axios";
import type { RemoteResponse } from "@/types/contract";
import type { Nullishable } from "@/utils/nullishUtils";
import type { FormDefinition } from "@/platform/forms/formTypes";
import type { UUID } from "@/types/stringTypes";
import type { RegistryId, SemVerString } from "@/types/registryTypes";
import type { JsonObject, RequireAtLeastOne } from "type-fest";
import type { TemporaryPanelDefinition } from "@/platform/panels/panelTypes";
import type { JavaScriptPayload } from "@/sandbox/messenger/api";
import type { Menus } from "webextension-polyfill";
import type { writeToClipboard } from "@/utils/clipboardUtils";
import type { IconConfig } from "@/types/iconTypes";
import type { Logger } from "@/types/loggerTypes";
import type { Notification } from "@/utils/notificationTypes";
import type { ModComponentRef } from "@/types/modComponentTypes";
import type { PanelPayload } from "@/types/sidebarTypes";
import type { SimpleEventTarget } from "@/utils/SimpleEventTarget";
import { validateSemVerString } from "@/types/helpers";
import type { TraceEntryData, TraceExitData } from "@/telemetry/trace";

export type AudioProtocol = {
  play(soundEffect: string): Promise<void>;
};

export type ClipboardProtocol = {
  write: typeof writeToClipboard;
};

export type BadgeProtocol = {
  setText(text: Nullishable<string>): void;
};

export type SelectionMenuOptions = {
  extensionId: UUID;
  title: string;
  contexts: Menus.ContextType[];
  documentUrlPatterns: string[];
};

type ContextMenuHandler = (args: Menus.OnClickData) => Promise<void>;

export type ContextMenuProtocol = {
  /**
   * Register a context menu item. In browsers, there's a single context menu per mod component.
   */
  register: (
    arg: SelectionMenuOptions & { handler: ContextMenuHandler },
  ) => Promise<void>;

  /**
   * Unregister all content menu items owner by a mod component
   * @param componentId the mod component
   */
  unregister: (modComponentId: UUID) => Promise<void>;
};

export type TextSelectionAction = {
  /**
   * The icon to display in the selection tooltip.
   * Currently, there's no way to set icons for context menu items, so icon will always be nullish
   */
  icon?: Nullishable<IconConfig>;
  /**
   * The user-visible title of the action.
   */
  title: string;
  /**
   * Text selection handler
   * @param text the selected text
   */
  handler: (text: string) => void;
};

/**
 * Protocol for a popover displayed when a user selects text
 * @since 1.8.10
 */
export interface SelectionTooltipProtocol {
  /**
   * Register a text selection action
   * @param modComponentId the owner mod component
   * @param action the action definition
   */
  register(modComponentId: UUID, action: TextSelectionAction): void;

  /**
   * Unregister all text selection actions for a given mod component
   * @param modComponentId the owner mod component
   */
  unregister(modComponentId: UUID): void;
}

/**
 * Protocol for showing toasts to the user
 * @since 1.8.10
 */
export interface ToastProtocol {
  /**
   * Show a notification
   */
  showNotification: (
    notification: RequireAtLeastOne<Notification, "message" | "error">,
  ) => string;

  /**
   * Hide a notification.
   */
  hideNotification: (id: string) => void;
}

/**
 * The tracing protocol.
 * @since 1.8.10
 */
export interface TraceProtocol {
  enter: (data: TraceEntryData) => void;
  exit: (data: TraceExitData) => void;
}

/**
 * The trace/debugger protocol.
 * @since 1.8.10
 */
export interface DebuggerProtocol {
  /**
   * Clear debug/trace entries for the given component.
   *
   * Awaitable to allow the caller to ensure the entries are cleared before continuing.
   *
   * @param componentId the mod component id
   */
  clear: (componentId: UUID) => Promise<void>;

  traces: TraceProtocol;
}

export type TextCommand = {
  /**
   * The mod component id that owns the command/snippet
   */
  componentId: UUID;
  /**
   * The shortcut to trigger the command, excluding the command key
   */
  shortcut: string;
  /**
   * The title/label of the snippet
   */
  title: string;
  /**
   * The text generator
   * @param currentText current text in the editor
   */
  handler: (currentText: string) => Promise<string>;
};

/**
 * Protocol for a text command popover triggered by a command key
 * @since 1.8.10
 */
export interface CommandPopoverProtocol {
  /**
   * Register a text command
   * @param command the command definition
   */
  register(command: TextCommand): void;

  /**
   * Unregister all text commands for a given mod component
   * @param modComponentId the owner mod component
   */
  unregister(modComponentId: UUID): void;
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

/**
 * The template for text templates, currently using nunjucks and handlebars.
 * @since 1.8.10
 */
export interface TemplateProtocol {
  render: (args: {
    engine: "nunjucks" | "handlebars";
    template: string;
    context: JsonObject;
    autoescape: boolean;
  }) => Promise<string>;

  // Must also provide a "validate" because nunjucks uses function constructor for compiling the template
  validate: (args: { engine: "nunjucks"; template: string }) => Promise<void>;
}

/**
 * Protocol for panels
 * @since 1.8.10
 */
export interface PanelProtocol {
  /**
   * Return true if the panel app is open. For example, the Chromium sidePanel
   */
  isContainerVisible: () => Promise<boolean>;

  /**
   * Remove all panels associated with the given extensionPointId.
   * @param extensionPointId the extension point id (internal or external)
   * @param options.preserveExtensionIds array of extension ids to keep in the panel. Used to avoid flickering if updating
   * the extensionPoint for a sidebar extension from the Page Editor
   */
  unregisterExtensionPoint: (
    extensionPointId: RegistryId,
    options?: { preserveExtensionIds?: UUID[] },
  ) => void;

  /**
   * Remove all panels associated with given componentIds.
   * @param componentIds the component UUIDs to remove
   */
  removeComponents: (componentIds: UUID[]) => void;

  /**
   * Create placeholder panels showing loading indicators
   */
  reservePanels: (refs: ModComponentRef[]) => void;

  /**
   * Update the heading of a panel with the given mod component id
   * @param componentId mod component id
   * @param heading the new heading
   */
  updateHeading: (componentId: UUID, heading: string) => void;

  /**
   * Upsert a panel for the given mod component
   * @param ref the mod component ref
   * @param heading the new heading for the panel
   * @param payload the new content for the panel
   */
  upsertPanel: (
    ref: ModComponentRef,
    heading: string,
    payload: PanelPayload,
  ) => void;

  /**
   * Event fired when the app is shown. For example, the Chromium sidePanel is opened.
   */
  showEvent: SimpleEventTarget<RunArgs>;

  /**
   * Show a temporary panel
   */
  showTemporary: (definition: TemporaryPanelDefinition) => Promise<JsonObject>;
}

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
    context: { componentId: UUID; modId?: RegistryId },
  ) => Promise<unknown>;

  /**
   * Run sandboxed Javascript. Does not have access to the DOM.
   * @since 1.8.10
   * @param code the function to run
   * @param data the data to pass to the function
   */
  runSandboxedJavascript: (args: JavaScriptPayload) => Promise<unknown>;

  /**
   * Prompt the user to select one or more elements on a host page.
   * @since 1.8.10
   */
  // XXX: this method only makes sense in the context of a content script. We might choose to exclude it from
  // the platform protocol.
  userSelectElementRefs: () => Promise<ElementReference[]>;

  /**
   * Perform an API request.
   * @since 1.8.10
   */
  request: <TData>(
    integrationConfig: Nullishable<SanitizedIntegrationConfig>,
    requestConfig: AxiosRequestConfig,
  ) => Promise<RemoteResponse<TData>>;

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
  get quickBar(): QuickBarRegistryProtocol;

  /**
   * The registry for the text selection tooltip.
   * @since 1.8.10
   */
  get selectionTooltip(): SelectionTooltipProtocol;

  /**
   * The registry for the text editor command popover.
   * @since 1.8.10
   */
  get commandPopover(): CommandPopoverProtocol;

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

export class PlatformBase implements PlatformProtocol {
  readonly capabilities: readonly PlatformCapability[] = [];

  constructor(
    readonly platformName: string,
    readonly version: SemVerString,
  ) {}

  alert(_message: unknown): void {
    throw new PlatformCapabilityNotAvailable(this.platformName, "alert");
  }

  prompt(
    _message: string | undefined,
    _default: string | undefined,
  ): string | null {
    throw new PlatformCapabilityNotAvailable(this.platformName, "alert");
  }

  async form(
    _definition: FormDefinition,
    _controller: AbortController,
    _context: {
      componentId: UUID;
      modId?: RegistryId;
    },
  ): Promise<unknown> {
    throw new PlatformCapabilityNotAvailable(this.platformName, "form");
  }

  async open(_url: URL): Promise<void> {
    throw new PlatformCapabilityNotAvailable(this.platformName, "link");
  }

  async request<TData>(
    _integrationConfig: Nullishable<SanitizedIntegrationConfig>,
    _requestConfig: AxiosRequestConfig,
  ): Promise<RemoteResponse<TData>> {
    throw new PlatformCapabilityNotAvailable(this.platformName, "http");
  }

  async runSandboxedJavascript(_args: JavaScriptPayload): Promise<unknown> {
    throw new PlatformCapabilityNotAvailable(this.platformName, "sandbox");
  }

  async userSelectElementRefs(): Promise<ElementReference[]> {
    throw new PlatformCapabilityNotAvailable(
      this.platformName,
      "contentScript",
    );
  }

  get logger(): Logger {
    throw new PlatformCapabilityNotAvailable(this.platformName, "logs");
  }

  get debugger(): DebuggerProtocol {
    throw new PlatformCapabilityNotAvailable(this.platformName, "debugger");
  }

  get audio(): AudioProtocol {
    throw new PlatformCapabilityNotAvailable(this.platformName, "audio");
  }

  get state(): StateProtocol {
    throw new PlatformCapabilityNotAvailable(this.platformName, "state");
  }

  get templates(): TemplateProtocol {
    throw new PlatformCapabilityNotAvailable(this.platformName, "template");
  }

  get contextMenus(): ContextMenuProtocol {
    throw new PlatformCapabilityNotAvailable(this.platformName, "contextMenu");
  }

  get badge(): BadgeProtocol {
    throw new PlatformCapabilityNotAvailable(this.platformName, "badge");
  }

  get quickBar(): QuickBarRegistryProtocol {
    throw new PlatformCapabilityNotAvailable(this.platformName, "quickBar");
  }

  get toasts(): ToastProtocol {
    throw new PlatformCapabilityNotAvailable(this.platformName, "toast");
  }

  get panels(): PanelProtocol {
    throw new PlatformCapabilityNotAvailable(this.platformName, "panel");
  }

  get selectionTooltip(): SelectionTooltipProtocol {
    throw new PlatformCapabilityNotAvailable(
      this.platformName,
      "selectionTooltip",
    );
  }

  get commandPopover(): CommandPopoverProtocol {
    throw new PlatformCapabilityNotAvailable(
      this.platformName,
      "commandPopover",
    );
  }

  get clipboard(): ClipboardProtocol {
    throw new PlatformCapabilityNotAvailable(
      this.platformName,
      "clipboardWrite",
    );
  }
}

/**
 * A platform protocol with no available capabilities.
 */
export const uninitializedPlatform = new PlatformBase(
  "uninitialized",
  validateSemVerString("0.0.0"),
);
