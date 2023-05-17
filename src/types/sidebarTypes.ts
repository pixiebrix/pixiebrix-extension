/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import type React from "react";
import { type UUID } from "@/types/stringTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type FormDefinition } from "@/blocks/transformers/ephemeralForm/formTypes";
import { type JsonObject } from "type-fest";
import {
  type RendererErrorPayload,
  type RendererLoadingPayload,
  type RendererRunPayload,
} from "@/types/rendererTypes";
import { type MessageContext } from "@/types/loggerTypes";

/**
 * Entry types supported by the sidebar.
 *
 * Current supports panels and ephemeral forms. In the future we may also support button entries, etc.
 *
 * @see PanelEntry
 * @see FormEntry
 * @see TemporaryPanelEntry
 * @see ActivateRecipeEntry
 */
export type EntryType =
  | "panel"
  | "form"
  | "temporaryPanel"
  | "activateRecipe"
  | "staticPanel";

/**
 * The information required to run the renderer of a pipeline, or error information if the pipeline run errored.
 */
export type PanelPayload =
  | RendererRunPayload
  | RendererLoadingPayload
  | RendererErrorPayload
  | null;

export function isRendererRunPayload(
  payload: PanelPayload
): payload is RendererRunPayload {
  return "blockId" in payload && "args" in payload && "ctxt" in payload;
}

export function isRendererLoadingPayload(
  payload: PanelPayload
): payload is RendererLoadingPayload {
  return "loadingMessage" in payload;
}

export function isRendererErrorPayload(
  payload: PanelPayload
): payload is RendererErrorPayload {
  return "error" in payload;
}

/**
 * Context for panel, with fields required for functionality marked as required.
 */
export type PanelContext = MessageContext & {
  extensionId: UUID;
  blueprintId: RegistryId | null;
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
};

/**
 * A panel added to the page by an IExtension.
 *
 * @see DisplayTemporaryInfo
 * @see SidebarExtensionPoint
 */
export type BaseExtensionPanelEntry = BasePanelEntry & {
  /**
   * The id of the extension that added the panel
   */
  extensionId: UUID;
  /**
   * The blueprint associated with the extension that added the panel.
   *
   * Used to:
   * - Give preference to blueprint side panels when using the "Show Sidebar" brick.
   * - Pass to the panel for actions that require the blueprint id, e.g., Get Page State, Set Page State, etc.
   *
   * @since 1.6.5
   */
  blueprintId: RegistryId | null;
  /**
   * Heading for tab name in the sidebar
   */
  heading: string;
  /**
   * The information required to run the renderer of a pipeline, or error information if the pipeline run errored.
   */
  payload: PanelPayload;
  /**
   * Actions to show for the panel
   * @since 1.7.19
   */
  actions?: PanelButton[];
};

/**
 * A panel added by an extension attached to an SidebarExtensionPoint
 * @see SidebarExtensionPoint
 */
export type PanelEntry = BaseExtensionPanelEntry & {
  type: "panel";
  /**
   * The sidebar extension point
   * @see SidebarExtensionPoint
   */
  extensionPointId: RegistryId;
};

/**
 * An ephemeral panel to show in the sidebar. Only one temporary panel can be shown from an extension at a time.
 */
export type TemporaryPanelEntry = BaseExtensionPanelEntry & {
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

/**
 * An ephemeral form to show in the sidebar. Only one form can be shown from an extension at a time.
 * @see ModalTransformer
 */
export type FormEntry = BasePanelEntry & {
  type: "form";
  /**
   * The extension that created the form
   */
  extensionId: UUID;
  /**
   * Unique identifier for the form instance. Used to correlate form submission/cancellation.
   */
  nonce: UUID;
  /**
   * The form schema and configuration
   */
  form: FormDefinition;
};

export type ActivateRecipeEntry = BasePanelEntry & {
  type: "activateRecipe";
  /**
   * The blueprint id of the recipe to activate
   */
  recipeId: RegistryId;
  /**
   * Heading for tab name in the sidebar
   */
  heading: string;
};

export type StaticPanelEntry = BasePanelEntry & {
  heading: string;
  type: "staticPanel";
  key: string;
  body: React.ReactNode;
};

export type SidebarEntry =
  | PanelEntry
  | FormEntry
  | TemporaryPanelEntry
  | ActivateRecipeEntry
  | StaticPanelEntry;

/**
 * The entries currently added to the sidebar
 */
export type SidebarEntries = {
  panels: PanelEntry[];
  forms: FormEntry[];
  temporaryPanels: TemporaryPanelEntry[];
  recipeToActivate: ActivateRecipeEntry | null;
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
export type PanelRunMeta = {
  runId: UUID;
  extensionId: UUID;
};

export type SidebarState = SidebarEntries & {
  activeKey: string;

  /**
   * Pending panel activation request.
   *
   * Because there's a race condition between activatePanel and setPanels, etc. we need to keep track of the activation
   * request in order to fulfill it once the panel is registered.
   */
  pendingActivePanel: ActivatePanelOptions | null;
};

export type SidebarRootState = { sidebar: SidebarState };
