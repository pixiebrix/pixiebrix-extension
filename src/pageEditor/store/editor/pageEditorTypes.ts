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
import { type ModComponentsRootState } from "@/store/modComponents/modComponentTypes";
import { type SettingsRootState } from "@/store/settings/settingsTypes";
import { type RuntimeRootState } from "@/pageEditor/store/runtime/runtimeSliceTypes";
import { type StarterBrickType } from "@/types/starterBrickTypes";
import { type UUID } from "@/types/stringTypes";
import { type Metadata, type RegistryId } from "@/types/registryTypes";
import { type BrickConfig, type PipelineFlavor } from "@/bricks/types";
import { type BrickPipelineUIState } from "@/pageEditor/store/editor/uiStateTypes";
import { type AnalysisRootState } from "@/analysis/analysisTypes";
import { type ModComponentFormState } from "../../starterBricks/formStateTypes";
import { type TabStateRootState } from "@/pageEditor/store/tabState/tabStateTypes";
import { type ModDefinitionsRootState } from "@/modDefinitions/modDefinitionsTypes";
import { type SimpleErrorObject } from "@/errors/errorHelpers";
import { type SessionChangesRootState } from "@/store/sessionChanges/sessionChangesTypes";
import { type SessionRootState } from "@/pageEditor/store/session/sessionSliceTypes";
import { type ModOptionsDefinition } from "@/types/modDefinitionTypes";
import { type Except } from "type-fest";
import {
  type BaseFormStateV1,
  type BaseFormStateV2,
  type BaseFormStateV3,
  type BaseFormStateV4,
} from "@/pageEditor/store/editor/baseFormStateTypes";

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
  MOVE_FROM_MOD,
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
   * The starter brick type, if the page editor is in "insertion-mode"
   */
  inserting: StarterBrickType | null;

  /**
   * The uuid of the active mod component form state, if a mod component is selected
   */
  activeElementId: UUID | null;

  /**
   * The registry id of the active mod, if a mod is selected
   */
  activeRecipeId: RegistryId | null;

  /**
   * The registry id of the 'expanded' mod in the sidebar, if one is expanded
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
  readonly elements: BaseFormStateV1[];

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
  elementUIStates: Record<UUID, BrickPipelineUIState>;

  /**
   * A clipboard-style-copy of a brick ready to paste into a mod component
   */
  copiedBlock?: BrickConfig;

  /**
   * Unsaved, changed mod options definitions
   */
  dirtyRecipeOptionsById: Record<RegistryId, ModOptionsDefinition>;

  /**
   * Unsaved, changed mod metadata
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
   * When creating a new mod from an existing mod component, should we keep a separate copy of the mod component?
   */
  // XXX: refactor & remove from top-level Redux state. This is a property of the create mod workflow:
  // https://github.com/pixiebrix/pixiebrix-extension/issues/3264
  keepLocalCopyOnCreateRecipe: boolean;

  /**
   * Unsaved mod components that have been deleted from a mod
   */
  deletedElementsByRecipeId: Record<RegistryId, BaseFormStateV1[]>;

  /**
   * The available installed mod components for the current tab
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
 * @deprecated - Do not use versioned state types directly, exported for testing
 */
export type EditorStateV2 = Except<
  EditorStateV1,
  "elements" | "deletedElementsByRecipeId"
> & {
  elements: BaseFormStateV2[];
  deletedElementsByRecipeId: Record<string, BaseFormStateV2[]>;
};

/**
 * @deprecated - Do not use versioned state types directly, exported for testing
 */
export type EditorStateV3 = Except<
  EditorStateV2,
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
   * When a mod component is selected in the Page Editor, a mod component form state is created for it and stored here;
   * that is, "touched" mod component form states.
   */
  readonly modComponentFormStates: BaseFormStateV2[];

  /**
   * Brick ids (not UUIDs) that the user has access to edit
   */
  knownEditableBrickIds: RegistryId[];

  /**
   * The current UI state of each brick pipeline, indexed by mod component id
   */
  brickPipelineUIStateById: Record<UUID, BrickPipelineUIState>;

  /**
   * A clipboard-style-copy of a brick ready to paste into a brick pipeline
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
  // XXX: refactor & remove from top-level Redux state. This is a property of the create mod workflow:
  // https://github.com/pixiebrix/pixiebrix-extension/issues/3264
  keepLocalCopyOnCreateMod: boolean;

  /**
   * Unsaved mod components that have been deleted from a mod
   */
  deletedModComponentFormStatesByModId: Record<RegistryId, BaseFormStateV2[]>;

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

/**
 * @deprecated - Do not use versioned state types directly, exported for testing
 */
export type EditorStateV4 = Except<
  EditorStateV3,
  "modComponentFormStates" | "deletedModComponentFormStatesByModId"
> & {
  modComponentFormStates: BaseFormStateV3[];
  deletedModComponentFormStatesByModId: Record<string, BaseFormStateV3[]>;
};

/**
 * @deprecated - Do not use versioned state types directly, exported for testing
 */
export type EditorStateV5 = Except<
  EditorStateV4,
  | "inserting"
  | "modComponentFormStates"
  | "deletedModComponentFormStatesByModId"
> & {
  insertingStarterBrickType: StarterBrickType | null;
  modComponentFormStates: BaseFormStateV4[];
  deletedModComponentFormStatesByModId: Record<string, BaseFormStateV4[]>;
};

/**
 * @deprecated - Do not use versioned state types directly, exported for testing
 */
export type EditorStateV6 = Except<EditorStateV5, "insertingStarterBrickType">;

// Instead of maintaining old enums, just clearing data panel state on migration, see migrateEditorStateV5
export type EditorStateV7 = EditorStateV6;

export type EditorState = Except<
  EditorStateV7,
  "modComponentFormStates" | "deletedModComponentFormStatesByModId"
> & {
  modComponentFormStates: ModComponentFormState[];
  deletedModComponentFormStatesByModId: Record<string, ModComponentFormState[]>;
};

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
  SessionChangesRootState;
