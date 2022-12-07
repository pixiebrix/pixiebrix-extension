/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { type AuthRootState } from "@/auth/authTypes";
import { type LogRootState } from "@/components/logViewer/logViewerTypes";
import { type ExtensionsRootState } from "@/store/extensionsTypes";
import { type SavingExtensionState } from "@/pageEditor/panes/save/savingExtensionSlice";
import { type SettingsRootState } from "@/store/settingsTypes";
import { type RuntimeRootState } from "@/pageEditor/slices/runtimeSlice";
import { type ExtensionPointType } from "@/extensionPoints/types";
import { type RegistryId, type UUID } from "@/core";
import { type BlockConfig } from "@/blocks/types";
import {
  type OptionsDefinition,
  type RecipeMetadataFormState,
} from "@/types/definitions";
import { type ElementUIState } from "@/pageEditor/uiState/uiStateTypes";
import { type AnalysisRootState } from "@/analysis/analysisTypes";
import { type FormState } from "./extensionPoints/formStateTypes";
import { type TabStateRootState } from "@/pageEditor/tabState/tabStateTypes";
import { type RecipesRootState } from "@/recipes/recipesTypes";
import { type SimpleErrorObject } from "@/errors/errorHelpers";
import { type SessionChangesRootState } from "@/pageEditor/sessionChanges/sessionChangesSlice";
import { type SessionRootState } from "@/pageEditor/slices/sessionSlice";

export enum PipelineFlavor {
  AllBlocks = "allBlocks",
  NoEffect = "noEffect",
  NoRenderer = "noRenderer",
}

export type AddBlockLocation = {
  /**
   * The object property path to the pipeline where a block will be added by the add block modal
   */
  path: string;

  /**
   * The flavor of pipeline where a block will be added by the add block modal
   * @see: PipelineFlavor
   */
  flavor: PipelineFlavor;

  /**
   * The pipeline index where a block will be added by the add block modal
   */
  index: number;
};

export enum ModalKey {
  ADD_TO_RECIPE,
  REMOVE_FROM_RECIPE,
  SAVE_AS_NEW_RECIPE,
  CREATE_RECIPE,
  ADD_BLOCK,
}

export interface EditorState {
  /**
   * A sequence number that changes whenever a new element is selected.
   *
   * Can use as a React component key to trigger a re-render
   */
  selectionSeq: number;

  /**
   * The element type, if the page editor is in "insertion-mode"
   */
  inserting: ExtensionPointType | null;

  /**
   * The uuid of the active element, if an extension is selected
   */
  activeElementId: UUID | null;

  /**
   * The registry id of the active recipe, if a recipe is selected
   */
  activeRecipeId: RegistryId | null;

  /**
   * The registry id of the 'expanded' recipe in the sidebar, if one is expanded
   */
  expandedRecipeId: RegistryId | null;

  /**
   * A serialized error that has occurred in the page editor
   */
  error: SimpleErrorObject | null;

  dirty: Record<string, boolean>;

  /**
   * Unsaved elements
   */
  readonly elements: FormState[];

  /**
   * Brick ids (not UUIDs) that are known to be editable by the current user
   */
  knownEditable: RegistryId[];

  /**
   * True if error is because user does not have access to beta features
   */
  beta?: boolean;

  /**
   * Is the user using the new page editor beta UI?
   */
  isBetaUI: boolean;

  /**
   * The current UI state of each element, indexed by element Id
   */
  elementUIStates: Record<UUID, ElementUIState>;

  /**
   * A clipboard-style-copy of a block ready to paste into an extension
   */
  copiedBlock?: BlockConfig;

  /**
   * Are we currently showing the info message to users about upgrading from v2 to v3 of
   * the runtime api for this extension?
   */
  showV3UpgradeMessageByElement: Record<UUID, boolean>;

  /**
   * Unsaved, changed recipe options
   */
  dirtyRecipeOptionsById: Record<RegistryId, OptionsDefinition>;

  /**
   * Unsaved, changed recipe metadata
   */
  dirtyRecipeMetadataById: Record<RegistryId, RecipeMetadataFormState>;

  /**
   * Which modal are we showing, if any?
   */
  visibleModalKey?: ModalKey;

  /**
   * The pipeline location where a new block will be added.
   *
   * Note: This will only have a value when visibleModalKey === "addBlock"
   *
   * @see AddBlockLocation
   */
  addBlockLocation?: AddBlockLocation;

  /**
   * When creating a new blueprint from an existing extension, should we keep a separate copy of the extension?
   */
  // XXX: refactor & remove from top-level Redux state. This is a property of the create recipe workflow:
  // https://github.com/pixiebrix/pixiebrix-extension/issues/3264
  keepLocalCopyOnCreateRecipe: boolean;

  /**
   * Unsaved extensions that have been deleted from a recipe
   */
  deletedElementsByRecipeId: Record<RegistryId, FormState[]>;

  /**
   * Newly created recipes that have not been saved yet
   */
  newRecipeIds: RegistryId[];

  /**
   * The available installed extensions for the current tab
   */
  availableInstalledIds: UUID[];

  /**
   * How many installed extensions are not available on the current tab?
   */
  unavailableInstalledCount: number;

  /**
   * The availableInstalledIds are being calculated
   */
  isPendingInstalledExtensions: boolean;

  /**
   * The available dynamic elements for the current tab
   */
  availableDynamicIds: UUID[];

  /**
   * The availableDynamicIds are being calculated
   */
  isPendingDynamicExtensions: boolean;

  /**
   * How many dynamic elements are not available on the current tab?
   */
  unavailableDynamicCount: number;
}

export type EditorRootState = {
  editor: EditorState;
};

export type RootState = AuthRootState &
  LogRootState &
  ExtensionsRootState &
  AnalysisRootState &
  EditorRootState &
  RecipesRootState &
  TabStateRootState &
  RuntimeRootState &
  SettingsRootState &
  SessionRootState &
  SessionChangesRootState & {
    savingExtension: SavingExtensionState;
  };
