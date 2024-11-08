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
import { type UUID } from "@/types/stringTypes";
import { type RegistryId, type VersionedMetadata } from "@/types/registryTypes";
import { type PipelineFlavor } from "@/bricks/types";
import { type AnalysisRootState } from "@/analysis/analysisTypes";
import { type TabStateRootState } from "@/pageEditor/store/tabState/tabStateTypes";
import { type ModDefinitionsRootState } from "@/modDefinitions/modDefinitionsTypes";
import { type SessionChangesRootState } from "@/store/sessionChanges/sessionChangesTypes";
import { type SessionRootState } from "@/pageEditor/store/session/sessionSliceTypes";
import { type ModVariablesDefinition } from "@/types/modDefinitionTypes";
import { type EmptyObject, type Except } from "type-fest";
import { type OptionsArgs } from "@/types/runtimeTypes";
import { type EditorStateMigratedV12 } from "@/pageEditor/store/editor/pageEditorTypes/editorStateMigrated";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { type EditorStateSynced } from "@/pageEditor/store/editor/pageEditorTypes/editorStateSynced";
import { type EditorStateEphemeral } from "@/pageEditor/store/editor/pageEditorTypes/editorStateEphemeral";

/**
 * Mod-level editor state passed to the runtime/analysis engine
 * @since 2.1.6
 */
export type DraftModState = {
  /**
   * The current option args for the draft mod
   */
  optionsArgs: OptionsArgs;
  /**
   * The current mod variables definition for the draft mod.
   */
  variablesDefinition: ModVariablesDefinition;
};

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
  MOVE_COPY_TO_MOD,
  SAVE_AS_NEW_MOD,
  CREATE_MOD,
  ADD_BRICK,
  SAVE_DATA_INTEGRITY_ERROR,
}

export type ModalDefinition =
  | { type: ModalKey.ADD_BRICK; data: { addBrickLocation: AddBrickLocation } }
  | { type: ModalKey.SAVE_AS_NEW_MOD; data: EmptyObject }
  | {
      type: ModalKey.CREATE_MOD;
      data: { keepLocalCopy: boolean } & (
        | { sourceModComponentId: UUID }
        | { sourceModId: RegistryId }
      );
    }
  | { type: ModalKey.MOVE_COPY_TO_MOD; data: { keepLocalCopy: boolean } }
  | { type: ModalKey.SAVE_DATA_INTEGRITY_ERROR; data: EmptyObject };

export type ModMetadataFormState = Pick<
  VersionedMetadata,
  "id" | "name" | "version" | "description"
>;

export type EditorState = Except<
  // On migration, re-point this type to the most recent EditorStateV<N> type name
  EditorStateMigratedV12,
  // Swap out any properties with versioned types for type references to the latest version.
  // NOTE: overriding these properties is not changing the type shape/structure. It's just cleaning up the type
  // name/reference which makes types easier to work with for testing migrations.
  "modComponentFormStates"
> & {
  modComponentFormStates: ModComponentFormState[];
} & EditorStateSynced &
  EditorStateEphemeral;

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

export * from "./editorStateEphemeral";
export * from "./editorStateSynced";
export * from "./editorStateMigrated";
