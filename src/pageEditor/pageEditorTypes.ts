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

import { AuthRootState } from "@/auth/authTypes";
import { LogRootState } from "@/components/logViewer/logViewerTypes";
import { ExtensionsRootState } from "@/store/extensionsTypes";
import { SavingExtensionState } from "@/pageEditor/panes/save/savingExtensionSlice";
import { SettingsState } from "@/store/settingsTypes";
import { RuntimeState } from "@/pageEditor/slices/runtimeSlice";
import { ExtensionPointType } from "@/extensionPoints/types";
import { RegistryId, UUID } from "@/core";
import { BlockConfig } from "@/blocks/types";
import {
  OptionsDefinition,
  RecipeMetadataFormState,
} from "@/types/definitions";
import { ElementUIState } from "@/pageEditor/uiState/uiStateTypes";
import {
  ActionFormState,
  SidebarFormState,
  TriggerFormState,
  PanelFormState,
  ContextMenuFormState,
  QuickBarFormState,
} from "./extensionPoints/formStateTypes";

export type FormState =
  | ActionFormState
  | SidebarFormState
  | TriggerFormState
  | PanelFormState
  | ContextMenuFormState
  | QuickBarFormState;

export enum PipelineType {
  Root,
  DocumentBuilder,
  ControlFlow,
}

export type AddBlockLocation = {
  /**
   * The object property path to the pipeline where a block will be added by the add block modal
   */
  path: string;

  /**
   * The type of pipeline where a block will be added by the add block modal
   * @see: PipelineType
   */
  type: PipelineType;

  /**
   * The pipeline index where a block will be added by the add block modal
   */
  index: number;
};

export type ModalKey =
  | null
  | "addToRecipe"
  | "removeFromRecipe"
  | "saveAsNewRecipe"
  | "createRecipe"
  | "addBlock";

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

  error: string | null;

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
  visibleModalKey: ModalKey;

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
}

export type RootState = AuthRootState &
  LogRootState &
  ExtensionsRootState & {
    editor: EditorState;
    savingExtension: SavingExtensionState;
    settings: SettingsState;
    runtime: RuntimeState;
  };
