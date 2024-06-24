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

import { type AuthRootState } from "@/auth/authTypes";
import { type LogRootState } from "@/components/logViewer/logViewerTypes";
import { type ModComponentsRootState } from "@/store/extensionsTypes";
import { type SavingExtensionState } from "@/pageEditor/panes/save/savingExtensionSlice";
import { type SettingsRootState } from "@/store/settings/settingsTypes";
import { type RuntimeRootState } from "@/pageEditor/slices/runtimeSliceTypes";
import { type StarterBrickType } from "@/types/starterBrickTypes";
import { type UUID } from "@/types/stringTypes";
import { type Metadata, type RegistryId } from "@/types/registryTypes";
import { type BrickConfig, type PipelineFlavor } from "@/bricks/types";
import { type ModComponentUIState } from "@/pageEditor/uiState/uiStateTypes";
import { type AnalysisRootState } from "@/analysis/analysisTypes";
import { type ModComponentFormState } from "./starterBricks/formStateTypes";
import { type TabStateRootState } from "@/pageEditor/tabState/tabStateTypes";
import { type ModDefinitionsRootState } from "@/modDefinitions/modDefinitionsTypes";
import { type SimpleErrorObject } from "@/errors/errorHelpers";
import { type SessionChangesRootState } from "@/store/sessionChanges/sessionChangesTypes";
import { type SessionRootState } from "@/pageEditor/slices/sessionSliceTypes";
import { type ModOptionsDefinition } from "@/types/modDefinitionTypes";
import { type Except } from "type-fest";

export type AddBrickLocation = {
  /**
   * The object property path to the pipeline where a block will be added by the add block modal
   */
  path: string;

  /**
   * The flavor of pipeline where a block will be added by the add block modal
   * @see PipelineFlavor
   */
  flavor: PipelineFlavor;

  /**
   * The pipeline index where a block will be added by the add block modal
   */
  index: number;
};

export enum ModalKey {
  ADD_TO_MOD,
  REMOVE_FROM_MOD,
  SAVE_AS_NEW_MOD,
  CREATE_MOD,
  ADD_BRICK,
  SAVE_DATA_INTEGRITY_ERROR,
}

export type ModMetadataFormState = Pick<
  Metadata,
  "id" | "name" | "version" | "description"
>;

/**
 * @deprecated - Do not use versioned state types directly
 */
export type EditorStateV1 = {
  /**
   * A sequence number that changes whenever a new element is selected.
   *
   * Can use as a React component key to trigger a re-render
   */
  selectionSeq: number;

  /**
   * The element type, if the page editor is in "insertion-mode"
   */
  inserting: StarterBrickType | null;

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
  readonly elements: ModComponentFormState[];

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
   * The current UI state of each element, indexed by the element id
   */
  elementUIStates: Record<UUID, ModComponentUIState>;

  /**
   * A clipboard-style-copy of a block ready to paste into an extension
   */
  copiedBlock?: BrickConfig;

  /**
   * Unsaved, changed recipe options definitions
   */
  dirtyRecipeOptionsById: Record<RegistryId, ModOptionsDefinition>;

  /**
   * Unsaved, changed recipe metadata
   */
  dirtyRecipeMetadataById: Record<RegistryId, ModMetadataFormState>;

  /**
   * Which modal are we showing, if any?
   */
  visibleModalKey: ModalKey | null;

  /**
   * The pipeline location where a new brick will be added.
   *
   * Note: This will only have a value when visibleModalKey === "addBlock"
   *
   * @see AddBrickLocation
   */
  addBlockLocation?: AddBrickLocation;

  /**
   * When creating a new blueprint from an existing extension, should we keep a separate copy of the extension?
   */
  // XXX: refactor & remove from top-level Redux state. This is a property of the create recipe workflow:
  // https://github.com/pixiebrix/pixiebrix-extension/issues/3264
  keepLocalCopyOnCreateRecipe: boolean;

  /**
   * Unsaved extensions that have been deleted from a recipe
   */
  deletedElementsByRecipeId: Record<RegistryId, ModComponentFormState[]>;

  /**
   * The available installed extensions for the current tab
   */
  availableInstalledIds: UUID[];

  /**
   * The availableInstalledIds are being calculated
   */
  isPendingInstalledExtensions: boolean;

  /**
   * The available draft mod components for the current tab
   */
  availableDynamicIds: UUID[];

  /**
   * The availableDynamicIds are being calculated
   */
  isPendingDynamicExtensions: boolean;

  /**
   * Is data panel expanded or collapsed
   */
  isDataPanelExpanded: boolean;

  /**
   * Is mod list expanded or collapsed
   */
  isModListExpanded: boolean;

  /**
   * Is the variable popover visible?
   * @since 1.7.34
   */
  isVariablePopoverVisible: boolean;

  /**
   * Has the user dismissed Page Editor dimensions warning (i.e., indicating the Page Editor is docked on the side)
   * Since 1.8.4
   */
  isDimensionsWarningDismissed: boolean;
};

/**
 * @deprecated - Do not use versioned state types directly
 */
export type EditorStateV2 = Except<
  EditorStateV1,
  | "activeElementId"
  | "activeRecipeId"
  | "expandedRecipeId"
  | "elements"
  | "knownEditable"
  | "elementUIStates"
  | "copiedBlock"
  | "dirtyRecipeOptionsById"
  | "dirtyRecipeMetadataById"
  | "addBlockLocation"
  | "keepLocalCopyOnCreateRecipe"
  | "deletedElementsByRecipeId"
  | "availableInstalledIds"
  | "isPendingInstalledExtensions"
  | "availableDynamicIds"
  | "isPendingDynamicExtensions"
> & {
  /**
   * The uuid of the active mod component, if a mod component is selected
   */
  activeModComponentId: UUID | null;

  /**
   * The registry id of the active mod, if a mod is selected
   */
  activeRecipeId: RegistryId | null;

  /**
   * The registry id of the 'expanded' mod in the sidebar, if one is expanded
   */
  expandedModId: RegistryId | null;

  /**
   * Unsaved mod component form states
   */
  readonly modComponentFormStates: ModComponentFormState[];

  /**
   * Brick ids (not UUIDs) that are known to be editable by the current user
   */
  knownEditableBrickIds: RegistryId[];

  /**
   * The current UI state of each brick pipeline, indexed by the brick pipeline id
   */
  brickPipelineUIStateById: Record<UUID, ModComponentUIState>;

  /**
   * A clipboard-style-copy of a brick ready to paste into an extension
   */
  copiedBrick?: BrickConfig;

  /**
   * Unsaved, changed mod options definitions
   */
  dirtyModOptionsById: Record<RegistryId, ModOptionsDefinition>;

  /**
   * Unsaved, changed mod metadata
   */
  dirtyModMetadataById: Record<RegistryId, ModMetadataFormState>;

  /**
   * The pipeline location where a new brick will be added.
   *
   * Note: This will only have a value when visibleModalKey === "addBlock"
   *
   * @see AddBrickLocation
   */
  addBrickLocation?: AddBrickLocation;

  /**
   * When creating a new mod from an existing mod component, should we keep a separate copy of the mod component?
   */
  // XXX: refactor & remove from top-level Redux state. This is a property of the create recipe workflow:
  // https://github.com/pixiebrix/pixiebrix-extension/issues/3264
  keepLocalCopyOnCreateMod: boolean;

  /**
   * Unsaved mod components that have been deleted from a mod
   */
  deletedModComponentFormStatesByModId: Record<
    RegistryId,
    ModComponentFormState[]
  >;

  /**
   * The available activated mod components for the current tab
   */
  availableActivatedModComponentIds: UUID[];

  /**
   * The availableActivatedModComponentIds are being calculated
   */
  isPendingAvailableActivatedModComponents: boolean;

  /**
   * The available draft mod components for the current tab
   */
  availableDraftModComponentIds: UUID[];

  /**
   * The availableDraftModComponentIds are being calculated
   */
  isPendingDraftModComponents: boolean;
};

export type EditorState = EditorStateV2;

export type EditorRootState = {
  editor: EditorState;
};

export type RootState = AuthRootState &
  LogRootState &
  ModComponentsRootState &
  AnalysisRootState &
  EditorRootState &
  ModDefinitionsRootState &
  TabStateRootState &
  RuntimeRootState &
  SettingsRootState &
  SessionRootState &
  SessionChangesRootState & {
    savingExtension: SavingExtensionState;
  };
