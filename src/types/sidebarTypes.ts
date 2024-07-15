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
import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type FormDefinition } from "@/platform/forms/formTypes";
import { type JsonObject } from "type-fest";
import {
  type RendererErrorPayload,
  type RendererLoadingPayload,
  type RendererRunPayload,
} from "@/types/rendererTypes";
import { type MessageContext } from "@/types/loggerTypes";
import { type ModComponentState } from "@/store/extensionsTypes";
import { isObject } from "@/utils/objectUtils";
import { type RunMetadata } from "@/types/runtimeTypes";
import type { ModActivationConfig } from "@/types/modTypes";
import type { Nullishable } from "@/utils/nullishUtils";
import type { ModComponentRef } from "@/types/modComponentTypes";

/**
 * Entry types supported by the sidebar.
 *
 * Current supports panels and ephemeral forms. In the future we may also support button entries, etc.
 *
 * @see PanelEntry
 * @see FormPanelEntry
 * @see TemporaryPanelEntry
 * @see ModActivationPanelEntry
 */
export type EntryType =
  | "panel"
  | "form"
  | "temporaryPanel"
  | "activateMods"
  | "staticPanel";

/**
 * The information required to run the renderer of a pipeline, or error information if the pipeline run errored.
 */
export type PanelPayload =
  | RendererRunPayload
  | RendererLoadingPayload
  | RendererErrorPayload;

export function isRendererLoadingPayload(
  payload: PanelPayload,
): payload is RendererLoadingPayload {
  return isObject(payload) && "loadingMessage" in payload;
}

export function isRendererErrorPayload(
  payload: PanelPayload,
): payload is RendererErrorPayload {
  return isObject(payload) && "error" in payload;
}

/**
 * Context for panel, with fields required for functionality marked as required.
 */
export type PanelContext = MessageContext & {
  modComponentId: UUID;
};

/**
 * An action to resolve a panel with a type and detail.
 *
 * Interface matches CustomEvent
 *
 * @see CustomEvent
 */
export type PanelAction = {
  /**
   * A custom type for the action, e.g., "submit", "cancel", etc.
   */
  type: string;

  /**
   * Optional payload for the action.
   */
  detail?: JsonObject;
};

export type PanelButton = PanelAction & {
  /**
   * Action caption/label
   */
  caption?: string;

  /**
   * Bootstrap button variant.
   */
  variant: string;
};

type BasePanelEntry = {
  /**
   * The panel type.
   */
  type: EntryType;

  /**
   * Determines if the panel cannot be displayed for the current tab. Used
   * to show an overlay over the panel to indicate it is unavailable. Added this
   * field to account for MV3 side panel that persists across page navigation
   *
   * @since 1.8.14
   */
  isUnavailable?: boolean;

  /**
   * Determines if the panel is connecting to the page.
   * This is used to display a spinner modal over the panel after a navigation occurs while the mod is remounting.
   *
   * @since 1.8.14
   */
  isConnecting?: boolean;
};

/**
 * A panel added to the page by an ModComponentBase.
 *
 * @see DisplayTemporaryInfo
 * @see SidebarStarterBrickABC
 */
export type BaseModComponentPanelEntry = BasePanelEntry & {
  /**
   * Reference to the ModComponent that added the panel.
   *
   * The mod is used to:
   * - Give preference to mod side panels when using the "Show Sidebar" brick.
   * - Pass to the panel for actions that require the mod id, e.g., Get Page State, Set Page State, etc.
   *
   * @since 2.0.5 refactored to use a single property for the mod component id and the containing mod id
   */
  modComponentRef: ModComponentRef;
  /**
   * Heading for tab name in the sidebar
   */
  heading: string;
  /**
   * The information required to run the renderer of a pipeline, or error information if the pipeline run errored.
   *
   * Null is the panel is being reserved, but a payload is not yet available.
   */
  payload: PanelPayload | null;
  /**
   * Actions to show for the panel
   * @since 1.7.19
   */
  actions?: PanelButton[];
};

export function isBaseModComponentPanelEntry(
  panel: unknown,
): panel is BaseModComponentPanelEntry {
  return (panel as BaseModComponentPanelEntry)?.modComponentRef != null;
}

/**
 * A panel added by an ModComponent attached to an SidebarStarterBrickABC
 * @see SidebarStarterBrickABC
 */
export type PanelEntry = BaseModComponentPanelEntry & {
  type: "panel";
};

export function isPanelEntry(panel: unknown): panel is PanelEntry {
  return (panel as PanelEntry)?.type === "panel";
}

/**
 * An ephemeral panel to show in the sidebar. Only one temporary panel can be shown from an extension at a time.
 */
export type TemporaryPanelEntry = BaseModComponentPanelEntry & {
  type: "temporaryPanel";
  /**
   * Unique identifier for the temporary panel instance. Used to correlate panel-close action.
   */
  nonce: UUID;
  /**
   * True if the panel has an "x" to be closed by the user (default=true)
   * @since 1.7.19
   */
  showCloseButton?: boolean;
};

export function isTemporaryPanelEntry(
  panel: unknown,
): panel is TemporaryPanelEntry {
  return (panel as TemporaryPanelEntry)?.type === "temporaryPanel";
}

/**
 * An ephemeral form to show in the sidebar. Only one form can be shown from an extension at a time.
 * @see ModalTransformer
 */
export type FormPanelEntry = BasePanelEntry & {
  type: "form";
  /**
   * Unique identifier for the form instance. Used to correlate form submission/cancellation.
   */
  nonce: UUID;
  /**
   * The mod component that created the form.
   */
  modComponentRef: ModComponentRef;
  /**
   * The form schema and configuration
   */
  form: FormDefinition;
};

export function isFormPanelEntry(panel: unknown): panel is FormPanelEntry {
  return (panel as FormPanelEntry)?.type === "form";
}

/**
 * Panel entry for activating one or more mods.
 *
 * @since 1.7.35 supports activating multiple mods if all mods don't require configuration
 * @since 1.8.8 supports providing initial options for each mod
 */
export type ModActivationPanelEntry = BasePanelEntry & {
  type: "activateMods";

  /**
   * One or more mod id(s) to activate. If providing multiple mod ids, none of the mods may require configuration.
   */
  mods: ModActivationConfig[];

  /**
   * Heading for tab name in the sidebar
   */
  heading: string;
};

export function isModActivationPanelEntry(
  panel: unknown,
): panel is ModActivationPanelEntry {
  return (panel as ModActivationPanelEntry)?.type === "activateMods";
}

export type StaticPanelEntry = BasePanelEntry & {
  heading: string;
  type: "staticPanel";
  key: string;
};

export function isStaticPanelEntry(panel: unknown): panel is StaticPanelEntry {
  return (panel as StaticPanelEntry)?.type === "staticPanel";
}

export type SidebarEntry =
  | PanelEntry
  | FormPanelEntry
  | TemporaryPanelEntry
  | ModActivationPanelEntry
  | StaticPanelEntry;

/**
 * The entries currently added to the sidebar
 */
export type SidebarEntries = {
  panels: PanelEntry[];
  forms: FormPanelEntry[];
  temporaryPanels: TemporaryPanelEntry[];
  staticPanels: StaticPanelEntry[];
  modActivationPanel: ModActivationPanelEntry | null;
};

/**
 * A request to activate a panel in the sidebar
 * @since 1.6.5
 */
export type ActivatePanelOptions = {
  /**
   * Force-activate the panel, even if the user is currently viewing a different panel that doesn't match the criteria
   *
   * @since 1.6.5
   */
  force?: boolean;

  /**
   * Refresh the panel content (default=true).
   *
   * Has no effect if the sidebar is not already showing
   *
   * @since 1.7.0
   */
  refresh?: boolean;

  /**
   * The id of the extension panel to show. Included so the Page Editor can request a specific panel to show when
   * editing the extension
   *
   * @since 1.6.5
   */
  extensionId?: UUID;
  /**
   * The blueprint of the extension panel to show
   *
   * @since 1.6.5
   */
  blueprintId?: RegistryId;
  /**
   * A panel heading name to match
   *
   * @since 1.6.5
   */
  panelHeading?: string;
};

/**
 * Metadata about the extension that produced the panel content
 * @since 1.7.0
 */
export type PanelRunMetadata = Pick<RunMetadata, "runId" | "modComponentRef">;

export type SidebarState = SidebarEntries & {
  activeKey: Nullishable<string>;

  /**
   * Pending panel activation request.
   *
   * Because there's a race condition between activatePanel and setPanels, etc. we need to keep track of the activation
   * request in order to fulfill it once the panel is registered.
   */
  pendingActivePanel: ActivatePanelOptions | null;

  closedTabs: Record<string, boolean>;
};

export interface SidebarRootState {
  options: ModComponentState;
  sidebar: SidebarState;
}
