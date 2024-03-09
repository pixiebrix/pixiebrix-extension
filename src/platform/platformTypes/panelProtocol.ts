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

import type { RegistryId } from "@/types/registryTypes";
import type { UUID } from "@/types/stringTypes";
import type { ModComponentRef } from "@/types/modComponentTypes";
import type { PanelPayload } from "@/types/sidebarTypes";
import type { SimpleEventTarget } from "@/utils/SimpleEventTarget";
import type { RunArgs } from "@/types/runtimeTypes";
import type { TemporaryPanelDefinition } from "@/platform/panels/panelTypes";
import type { JsonObject } from "type-fest";

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
