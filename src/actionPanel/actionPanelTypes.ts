/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { RegistryId, UUID } from "@/core";
import { FormDefinition } from "@/blocks/transformers/ephemeralForm/formTypes";

/**
 * Information required to display a renderer
 */
export type RendererPayload = {
  /**
   * The registry id of the renderer block, e.g., @pixiebrix/table
   */
  blockId: RegistryId;
  /**
   * A unique id for the content, used control re-rendering (similar to `key` in React)
   */
  key: string;
  /**
   * The BlockArg to pass to the renderer
   * @see BlockProps.args
   * @see BlockArg
   */
  args: unknown;
  /**
   * The context to pass to the renderer
   * @see BlockProps.context
   * @see BlockOptions
   */
  ctxt: unknown;
};

export type RendererError = {
  /**
   * A unique id for the content, used control re-rendering (similar to `key` in React)
   */
  key: string;
  /**
   * The error message to show in the panel
   */
  error: string;
};

/**
 * Entry types supported by the action panel.
 *
 * Current supports panels and ephemeral forms. In the future we may also support button entries, etc.
 *
 * @see PanelEntry
 * @see FormEntry
 */
export type EntryType = "panel" | "form";

/**
 * A panel added by an extension attached to an ActionPanelExtensionPoint
 * @see ActionPanelExtensionPoint
 */
export type PanelEntry = {
  /**
   * The extension that added the panel
   */
  extensionId: UUID;
  /**
   * The actionPanel extension point
   * @see ActionPanelExtensionPoint
   */
  extensionPointId: RegistryId;
  /**
   * Heading for tab name in the action panel
   */
  heading: string;
  payload: RendererPayload | RendererError | null;
};

/**
 * An ephemeral form to show in the sidebar. Only one form can be shown from an extension at a time.
 * @see ModalTransformer
 */
export type FormEntry = {
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

/**
 * The store/state of entries currently added to the action panel
 */
export type ActionPanelStore = {
  panels: PanelEntry[];
  forms: FormEntry[];
};
