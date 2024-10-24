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

import { createSelector } from "@reduxjs/toolkit";
import {
  type EditorRootState,
  type EditorState,
  type ModalDefinition,
  ModalKey,
  type RootState,
} from "@/pageEditor/store/editor/pageEditorTypes";
import { flatMap, isEmpty, memoize, sortBy, uniqBy } from "lodash";
import { DataPanelTabKey } from "@/pageEditor/tabs/editTab/dataPanel/dataPanelTypes";
import {
  type BrickPipelineUIState,
  type DataPanelTabUIState,
} from "@/pageEditor/store/editor/uiStateTypes";
import { type ModComponentsRootState } from "@/store/modComponents/modComponentTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { deserializeError } from "serialize-error";
import {
  type ActivatedModComponent,
  type ModComponentBase,
  type ModMetadata,
} from "@/types/modComponentTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type UUID } from "@/types/stringTypes";
import { AnnotationType } from "@/types/annotationTypes";
import { selectKnownEventNames } from "@/analysis/analysisSelectors";
import { normalizeModOptionsDefinition } from "@/utils/modUtils";
import { type AnalysisRootState } from "@/analysis/analysisTypes";
import { assertNotNullish, type Nullishable } from "@/utils/nullishUtils";
import { type ReportEventData } from "@/telemetry/telemetryTypes";
import { selectModInstances } from "@/store/modComponents/modInstanceSelectors";
import mapModDefinitionToModMetadata from "@/modDefinitions/util/mapModDefinitionToModMetadata";
import { selectActivatedModComponents } from "@/store/modComponents/modComponentSelectors";
import type { Selector } from "react-redux";

export const selectActiveModComponentId = ({ editor }: EditorRootState) => {
  if (editor == null) {
    console.warn(
      "selectActiveModComponentId called without editor redux slice",
    );
    return null;
  }

  return editor.activeModComponentId;
};

export const selectModComponentFormStates = ({
  editor,
}: EditorRootState): EditorState["modComponentFormStates"] =>
  editor.modComponentFormStates;

export const selectGetModComponentFormStatesByModId = createSelector(
  selectModComponentFormStates,
  (formStates) =>
    memoize((modId: RegistryId) =>
      formStates.filter((formState) => formState.modMetadata.id === modId),
    ),
);

export const selectActiveModComponentFormState = createSelector(
  selectActiveModComponentId,
  selectModComponentFormStates,
  (activeModComponentId, formStates) =>
    formStates.find((x) => x.uuid === activeModComponentId),
);

/**
 * Select the id of the mod being edited. NOTE: is null when editing a mod component within the mod.
 * @see selectModId
 * @see selectCurrentModId
 */
export const selectActiveModId = ({ editor }: EditorRootState) =>
  editor.activeModId;

/**
 * Select the id of the "expanded" mod in the accordian layout in the Mod Listing Pane. NOTE: is null if the
 * user has collapsed item for the mod.
 * @see selectActiveModId
 * @see selectModId
 */
export const selectExpandedModId = ({ editor }: EditorRootState) =>
  editor.expandedModId;

/**
 * Select the mod id associated with the selected mod package or mod component. Should be used if the caller doesn't
 * need to know if the mod item or one of its components is selected.
 * @see selectActiveModId
 * @see selectExpandedModId
 */
export const selectCurrentModId = createSelector(
  selectActiveModId,
  selectActiveModComponentFormState,
  (activeModId, activeModComponentFormState) =>
    activeModId ?? activeModComponentFormState?.modMetadata.id,
);

/**
 * Select a runtime ModComponentRef for the mod component being edited
 * @see ModComponentRef
 */
export const selectActiveModComponentRef = createSelector(
  selectActiveModComponentFormState,
  (formState) => {
    assertNotNullish(
      formState,
      "selectActiveModComponentRef can only be used in a mod component editing context",
    );

    return {
      modComponentId: formState.uuid,
      modId: formState.modMetadata.id,
      // XXX: the Page Editor form state uses an artificial id. When it's added to the page, the artificial id will be
      // replaced with the hash id calculated during hydration
      starterBrickId: formState.starterBrick.metadata.id,
    };
  },
);

export const selectErrorState = ({ editor }: EditorRootState) => ({
  isBetaError: editor.error && editor.beta,
  editorError: editor.error ? deserializeError(editor.error) : null,
});

const selectIsModComponentDirtyById = ({ editor }: EditorRootState) =>
  editor.dirty;

/** @internal */
export const selectDeletedComponentFormStatesByModId = ({
  editor,
}: EditorRootState) => editor.deletedModComponentFormStatesByModId;

const selectAllDeletedModComponentIds = ({ editor }: EditorRootState) =>
  new Set(
    flatMap(editor.deletedModComponentFormStatesByModId).map(
      (formState) => formState.uuid,
    ),
  );

export const selectNotDeletedModComponentFormStates: ({
  editor,
}: EditorRootState) => ModComponentFormState[] = createSelector(
  selectModComponentFormStates,
  selectAllDeletedModComponentIds,
  (modComponentFormStates, deletedModComponentIds) =>
    modComponentFormStates.filter(
      ({ uuid }) => !deletedModComponentIds.has(uuid),
    ),
);

export const selectNotDeletedActivatedModComponents: ({
  options,
}: ModComponentsRootState) => ActivatedModComponent[] = createSelector(
  selectActivatedModComponents,
  selectAllDeletedModComponentIds,
  (activatedModComponents, deletedModComponentIds) =>
    activatedModComponents.filter(({ id }) => !deletedModComponentIds.has(id)),
);

export const selectDirtyModOptionsDefinitions = ({ editor }: EditorRootState) =>
  editor.dirtyModOptionsById;

const dirtyOptionsDefinitionsForModIdSelector = createSelector(
  selectDirtyModOptionsDefinitions,
  (_state: EditorRootState, modId: RegistryId | null) => modId,
  (dirtyOptionsDefinitionsByModId, modId) => {
    if (modId == null) {
      return;
    }

    // eslint-disable-next-line security/detect-object-injection -- RegistryId for mod
    const options = dirtyOptionsDefinitionsByModId[modId];

    if (options) {
      // Provide a consistent shape of the options
      return normalizeModOptionsDefinition(options);
    }

    // Return undefined if the options aren't dirty. Returning nullish instead of a default empty options allows the
    // caller to distinguish no dirty options vs. options that have been reverted to the default.
  },
);

export const selectDirtyOptionsDefinitionsForModId =
  (modId: RegistryId | null) => (state: EditorRootState) =>
    dirtyOptionsDefinitionsForModIdSelector(state, modId);

const dirtyOptionValuesForModIdSelector = createSelector(
  selectNotDeletedModComponentFormStates,
  (_state: EditorRootState, modId: RegistryId | null) => modId,
  (formStates, modId) =>
    formStates.find((formState) => formState.modMetadata.id === modId)
      ?.optionsArgs,
);

export const selectDirtyOptionValuesForModId =
  (modId: RegistryId | null) => (state: EditorRootState) =>
    dirtyOptionValuesForModIdSelector(state, modId);

export const selectDirtyModMetadata = ({ editor }: EditorRootState) =>
  editor.dirtyModMetadataById;

const dirtyMetadataForModIdSelector = createSelector(
  selectDirtyModMetadata,
  (_state: EditorRootState, modId: RegistryId) => modId,
  (dirtyModMetadataById, modId) =>
    // eslint-disable-next-line security/detect-object-injection -- modId is a controlled string
    dirtyModMetadataById[modId],
);

export const selectDirtyMetadataForModId =
  (modId: RegistryId | undefined) => (state: EditorRootState) =>
    modId ? dirtyMetadataForModIdSelector(state, modId) : null;

const modComponentIsDirtySelector = createSelector(
  selectIsModComponentDirtyById,
  (_state: RootState, modComponentId: UUID) => modComponentId,
  (isModComponentDirtyById, modComponentId) =>
    // eslint-disable-next-line security/detect-object-injection -- UUID
    isModComponentDirtyById[modComponentId] ?? false,
);

export const selectModComponentIsDirty =
  (modComponentId: UUID) => (state: RootState) =>
    modComponentIsDirtySelector(state, modComponentId);

const modIsDirtySelector = createSelector(
  selectIsModComponentDirtyById,
  dirtyOptionsDefinitionsForModIdSelector,
  dirtyMetadataForModIdSelector,
  (state: EditorRootState, modId: RegistryId) =>
    // eslint-disable-next-line security/detect-object-injection -- RegistryId is a controlled string
    selectDeletedComponentFormStatesByModId(state)[modId],
  ({ editor }: EditorRootState, modId: RegistryId) =>
    editor.modComponentFormStates
      .filter((formState) => formState.modMetadata.id === modId)
      .map((formState) => formState.uuid),
  (
    isModComponentDirtyById,
    dirtyModOptions,
    dirtyModMetadata,
    deletedModComponentFormStates,
    modComponentFormStateIds,
    // eslint-disable-next-line max-params -- all are needed
  ) => {
    const hasDirtyComponentFormStates = modComponentFormStateIds.some(
      // eslint-disable-next-line security/detect-object-injection -- UUID
      (modComponentId) => isModComponentDirtyById[modComponentId],
    );
    return (
      hasDirtyComponentFormStates ||
      Boolean(dirtyModOptions) ||
      Boolean(dirtyModMetadata) ||
      !isEmpty(deletedModComponentFormStates)
    );
  },
);

export const selectModIsDirty =
  (modId?: RegistryId) => (state: EditorRootState) =>
    Boolean(modId && modIsDirtySelector(state, modId));

export const selectEditorModalVisibilities = ({ editor }: EditorRootState) => {
  const { type } = editor.visibleModal ?? {};

  return {
    isMoveCopyToModVisible: type === ModalKey.MOVE_COPY_TO_MOD,
    isSaveAsNewModModalVisible: type === ModalKey.SAVE_AS_NEW_MOD,
    isCreateModModalVisible: type === ModalKey.CREATE_MOD,
    isAddBlockModalVisible: type === ModalKey.ADD_BRICK,
    isSaveDataIntegrityErrorModalVisible:
      type === ModalKey.SAVE_DATA_INTEGRITY_ERROR,
  };
};

export const selectActivatedModMetadatas = createSelector(
  selectModComponentFormStates,
  selectModInstances,
  selectDirtyModMetadata,
  (formStates, modInstances, dirtyModMetadataById) => {
    const formStateModMetadatas: Array<ModComponentBase["modMetadata"]> =
      formStates.map((formState) => formState.modMetadata);
    const activatedModMetadatas: Array<ModComponentBase["modMetadata"]> =
      modInstances.map((x) => mapModDefinitionToModMetadata(x.definition));

    const baseMetadatas = uniqBy(
      [...formStateModMetadatas, ...activatedModMetadatas],
      (x) => x.id,
    );

    return baseMetadatas.map((metadata) => {
      const dirtyMetadata = dirtyModMetadataById[metadata.id];
      if (dirtyMetadata) {
        return {
          ...metadata,
          ...dirtyMetadata,
        } as ModMetadata;
      }

      return metadata;
    });
  },
);

export const selectModMetadataMap = createSelector(
  selectActivatedModMetadatas,
  (metadatas) => {
    const metadataMap = new Map<RegistryId, ModMetadata>();
    for (const metadata of metadatas) {
      metadataMap.set(metadata.id, metadata);
    }

    return metadataMap;
  },
);

export const selectEditorUpdateKey = ({ editor }: EditorRootState) =>
  editor.selectionSeq;

export const selectIsEditorSidebarExpanded = ({ editor }: EditorRootState) =>
  editor.isModListExpanded;

export const selectIsDataPanelExpanded = ({ editor }: EditorRootState) =>
  editor.isDataPanelExpanded;

// UI state
export function selectActiveBrickPipelineUIState({
  editor,
}: EditorRootState): Nullishable<BrickPipelineUIState> {
  if (editor.activeModComponentId == null) {
    console.warn(
      "selectActiveBrickPipelineUIState called without activeModComponentId",
    );
    return null;
  }

  return editor.brickPipelineUIStateById[editor.activeModComponentId];
}

export const selectActiveBrickConfigurationUIState = createSelector(
  selectActiveBrickPipelineUIState,
  (brickPipelineUIState) =>
    brickPipelineUIState?.nodeUIStates[brickPipelineUIState.activeNodeId],
);

export const selectActiveNodeId = createSelector(
  selectActiveBrickPipelineUIState,
  (brickPipelineUIState) => brickPipelineUIState?.activeNodeId,
);

export const selectPipelineMap = createSelector(
  selectActiveBrickPipelineUIState,
  (uiState: BrickPipelineUIState) => uiState?.pipelineMap,
);

export const selectActiveNodeInfo = createSelector(
  selectActiveBrickPipelineUIState,
  selectActiveNodeId,
  (
    uiState: Nullishable<BrickPipelineUIState>,
    activeNodeId: Nullishable<UUID>,
  ) => {
    assertNotNullish(
      uiState,
      `uiState is ${typeof uiState === "object" ? "null" : "undefined"}`,
    );

    assertNotNullish(activeNodeId, "activeNodeId is nullish");

    // eslint-disable-next-line security/detect-object-injection -- UUID
    const activeNodeInfo = uiState.pipelineMap[activeNodeId];

    assertNotNullish(
      activeNodeInfo,
      `activeNodeInfo not found for node id: ${activeNodeId}`,
    );

    return activeNodeInfo;
  },
);

export const selectCollapsedNodes = createSelector(
  selectActiveBrickPipelineUIState,
  (brickPipelineUIState: BrickPipelineUIState) =>
    Object.entries(brickPipelineUIState.nodeUIStates)
      .map(([nodeId, { collapsed }]) => (collapsed ? nodeId : null))
      .filter((nodeId) => nodeId != null),
);

const activeModComponentNodeInfoSelector = createSelector(
  selectActiveBrickPipelineUIState,
  (state: EditorRootState, instanceId: UUID) => instanceId,
  (uiState: BrickPipelineUIState, instanceId: UUID) =>
    // eslint-disable-next-line security/detect-object-injection -- using a node uuid
    uiState.pipelineMap[instanceId],
);

export const selectActiveModComponentNodeInfo =
  (instanceId: UUID) => (state: EditorRootState) =>
    activeModComponentNodeInfoSelector(state, instanceId);

const parentNodeInfoSelector = createSelector(
  selectActiveBrickPipelineUIState,
  (state: EditorRootState, nodeId: UUID) => nodeId,
  (brickPipelineUIState: BrickPipelineUIState, nodeId: UUID) => {
    if (brickPipelineUIState == null) {
      return null;
    }

    // eslint-disable-next-line security/detect-object-injection -- UUID
    const { parentNodeId } = brickPipelineUIState.pipelineMap[nodeId] ?? {};
    if (!parentNodeId) {
      return null;
    }

    // eslint-disable-next-line security/detect-object-injection -- UUID
    return brickPipelineUIState.pipelineMap[parentNodeId];
  },
);

/**
 * Return the brick with the pipeline that contains the given node.
 * @param nodeId the instance id of the brick pipeline node
 */
export const selectParentNodeInfo =
  (nodeId: UUID) => (state: EditorRootState) =>
    parentNodeInfoSelector(state, nodeId);

export const selectNodeDataPanelTabSelected: (
  rootState: EditorRootState,
) => Nullishable<DataPanelTabKey> = createSelector(
  selectActiveBrickConfigurationUIState,
  (brickConfigurationUIState) =>
    brickConfigurationUIState?.dataPanel.activeTabKey,
);

export function selectNodeDataPanelTabState(
  rootState: EditorRootState,
  tabKey: DataPanelTabKey,
): Nullishable<DataPanelTabUIState> {
  const brickConfigurationUIState =
    selectActiveBrickConfigurationUIState(rootState);
  // eslint-disable-next-line security/detect-object-injection -- tabKeys will be hard-coded strings
  return brickConfigurationUIState?.dataPanel[tabKey];
}

/**
 * Returns the active element of the Document or Form builder, or null if no element is selected.
 */
export function selectActiveBuilderPreviewElement(
  state: EditorRootState,
): string | null {
  return (
    selectNodeDataPanelTabState(state, DataPanelTabKey.Design)?.activeElement ??
    null
  );
}

/**
 * Returns a selector to get the data for the currently visible modal
 * @throws Error if the specified modalKey is not visible
 */
export function getModalDataSelector<T extends ModalKey>(
  modalKey: T,
): Selector<EditorRootState, Extract<ModalDefinition, { type: T }>["data"]> {
  return ({ editor }: EditorRootState) => {
    const { visibleModal } = editor;
    if (visibleModal?.type !== modalKey) {
      throw new Error(`Modal is not visible: ${modalKey}`);
    }

    return visibleModal.data;
  };
}

const activeModComponentAnalysisAnnotationsForPath = createSelector(
  selectActiveModComponentId,
  ({ analysis }: AnalysisRootState) => analysis.extensionAnnotations,
  (state: RootState, path?: string) => path,
  ({ editor }: EditorRootState) => editor.isVariablePopoverVisible,
  (activeModComponentId, annotations, path, isVariablePopoverVisible) => {
    if (activeModComponentId == null) {
      return [];
    }

    const modComponentFormStateAnnotations =
      // eslint-disable-next-line security/detect-object-injection -- non-user generated UUID
      annotations?.[activeModComponentId] ?? [];

    const filteredAnnotations = modComponentFormStateAnnotations.filter(
      ({ analysisId, position }) =>
        position.path === path &&
        // Hide variable/template annotations while the popover is open because the user is editing the field
        (!isVariablePopoverVisible ||
          !["var", "template"].includes(analysisId)),
    );

    return sortBy(filteredAnnotations, (annotation) => {
      switch (annotation.type) {
        case AnnotationType.Error: {
          return 2;
        }

        case AnnotationType.Warning: {
          return 1;
        }

        default: {
          return 0;
        }
      }
    });
  },
);

/**
 * Selects the analysis annotations for the given path
 * @param path A path relative to the root of the mod component or root pipeline
 *
 * @note This should NOT be used outside the page editor, it is tightly coupled with editorSlice
 */
export const selectActiveModComponentAnalysisAnnotationsForPath =
  (path?: string) => (state: RootState) =>
    activeModComponentAnalysisAnnotationsForPath(state, path);

export const selectCopiedBrick = ({ editor }: EditorRootState) =>
  editor.copiedBrick;

export const selectModComponentAvailability = ({
  editor: {
    availableActivatedModComponentIds,
    isPendingAvailableActivatedModComponents,
    availableDraftModComponentIds,
    isPendingDraftModComponents,
  },
}: EditorRootState) => ({
  availableActivatedModComponentIds,
  isPendingAvailableActivatedModComponents,
  availableDraftModComponentIds,
  isPendingDraftModComponents,
});

export const selectKnownEventNamesForActiveModComponent = createSelector(
  selectActiveModComponentId,
  selectKnownEventNames,
  (activeModComponentId, knownEventNameMap) => {
    if (activeModComponentId == null) {
      return [];
    }

    // eslint-disable-next-line security/detect-object-injection -- is a UUID
    return knownEventNameMap[activeModComponentId] ?? [];
  },
);

export const selectIsDimensionsWarningDismissed = (state: EditorRootState) =>
  state.editor.isDimensionsWarningDismissed;

/**
 * Return event telemetry data for the currently selected node.
 */
export const selectActiveNodeEventData = createSelector(
  selectActiveModComponentFormState,
  selectActiveNodeInfo,
  (activeModComponentFormState, activeNodeInfo) => {
    assertNotNullish(
      activeModComponentFormState,
      "selectActiveNodeEventData can only be called from a mod component context",
    );

    return {
      modId: activeModComponentFormState.modMetadata.id,
      brickId: activeNodeInfo.blockId,
    } satisfies ReportEventData;
  },
);

export const selectFirstModComponentFormStateForActiveMod = createSelector(
  selectModComponentFormStates,
  selectActiveModId,
  (formState, activeModId) =>
    formState.find((x) => x.modMetadata.id === activeModId),
);

export const selectGetCleanComponentsAndDirtyFormStatesForMod = createSelector(
  selectNotDeletedActivatedModComponents,
  selectNotDeletedModComponentFormStates,
  selectIsModComponentDirtyById,
  (activatedModComponents, formStates, isDirtyByComponentId) =>
    // Memoize because method constructs a fresh object reference
    memoize((modId: RegistryId) => {
      const dirtyModComponentFormStates = formStates.filter(
        (formState) =>
          formState.modMetadata.id === modId &&
          isDirtyByComponentId[formState.uuid],
      );

      const cleanModComponents = activatedModComponents.filter(
        (modComponent) =>
          modComponent.modMetadata.id === modId &&
          !dirtyModComponentFormStates.some(
            (formState) => formState.uuid === modComponent.id,
          ),
      );

      return {
        cleanModComponents,
        dirtyModComponentFormStates,
      };
    }),
);

export const selectGetDraftModComponentsForMod = createSelector(
  selectGetCleanComponentsAndDirtyFormStatesForMod,
  (getCleanComponentsAndDirtyFormStatesForMod) =>
    // Memoize because method constructs a fresh object reference
    memoize((modId: RegistryId) => {
      const { cleanModComponents, dirtyModComponentFormStates } =
        getCleanComponentsAndDirtyFormStatesForMod(modId);

      // Return a consistent order so mod component order is stable on save
      return sortBy(
        [...cleanModComponents, ...dirtyModComponentFormStates],
        (x) => x.label,
      );
    }),
);
