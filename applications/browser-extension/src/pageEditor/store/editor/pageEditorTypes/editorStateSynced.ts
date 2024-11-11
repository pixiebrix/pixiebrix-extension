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

import { type BrickPipelineUIState } from "@/pageEditor/store/editor/uiStateTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";

/**
 * The "Find in mod" query options.
 */
type FindQueryOptions = {
  query: string;
};

/**
 * Page Editor Slice state that is persisted using redux-persist, but
 * should be reset to initial state during a redux-persist migration.
 *
 * Changing the keys in the future does not require a migration.
 * Prefer `null` to `undefined` to require the keys in initialSyncedState
 * The initialSyncedState is used to reset the synced state during
 * EditorStateMigratedV<N> migrations
 *
 * @see EditorStateEphemeral
 * @see EditorStateMigratedV<N>
 * @see initialSyncedState
 */
export type EditorStateSynced = {
  /**
   * The uuid of the active mod component, if a mod component is selected
   *
   * @see activeModId
   * @see expandedModId
   */
  activeModComponentId: UUID | null;

  /**
   * The registry id of the active mod, if a mod is selected. Is null if a mod component is selected.
   *
   * @see expandedModId
   * @see activeModComponentId
   */
  activeModId: RegistryId | null;

  /**
   * The registry id of the 'expanded' mod in the sidebar, if one is expanded. Is set if the mod is selected or a
   * mod component within the mod component is selected.
   *
   * @see activeModId
   * @see activeModComponentId
   */
  expandedModId: RegistryId | null;

  /**
   * The current UI state of each brick pipeline, indexed by mod component id
   */
  brickPipelineUIStateById: Record<UUID, BrickPipelineUIState>;

  /**
   * Is data panel expanded or collapsed
   */
  isDataPanelExpanded: boolean;

  /**
   * Is mod listing panel expanded or collapsed
   */
  isModListingPanelExpanded: boolean;

  /**
   * Find data panel options by mod id
   */
  findOptionsByModId: Record<RegistryId, FindQueryOptions> | null;
};
