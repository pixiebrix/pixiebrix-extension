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

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  selectDeletedElements,
  selectDirty,
  selectDirtyRecipeMetadata,
  selectDirtyRecipeOptionDefinitions,
  selectElements,
} from "@/pageEditor/slices/editorSelectors";
import {
  useGetEditablePackagesQuery,
  useUpdateRecipeMutation,
} from "@/services/api";
import notify from "@/utils/notify";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { useModals } from "@/components/ConfirmationModal";
import { selectExtensions } from "@/store/extensionsSelectors";
import { buildNewMod } from "@/pageEditor/panes/save/saveHelpers";
import { selectRecipeMetadata } from "@/pageEditor/panes/save/useSavingWizard";
import extensionsSlice from "@/store/extensionsSlice";
import useUpsertModComponentFormState from "@/pageEditor/hooks/useUpsertModComponentFormState";
import { type RegistryId } from "@/types/registryTypes";
import { useAllModDefinitions } from "@/modDefinitions/modDefinitionHooks";
import { reactivateEveryTab } from "@/background/messenger/api";
import { ensureElementPermissionsFromUserGesture } from "@/pageEditor/editorPermissionsHelpers";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import type { EditablePackageMetadata } from "@/types/contract";
import type { ModDefinition } from "@/types/modDefinitionTypes";

const { actions: optionsActions } = extensionsSlice;

// Exported for testing
export function isModEditable(
  editablePackages: EditablePackageMetadata[],
  modDefinition: ModDefinition,
): boolean {
  // The user might lose access to the mod while they were editing it (the mod or a mod component)
  // See https://github.com/pixiebrix/pixiebrix-extension/issues/2813
  const modId = modDefinition?.metadata?.id;
  return modId != null && editablePackages.some((x) => x.name === modId);
}

type ModSaver = {
  save: (modId: RegistryId) => Promise<void>;
  isSaving: boolean;
};

function useSaveMod(): ModSaver {
  const dispatch = useDispatch();
  const upsertModComponentFormState = useUpsertModComponentFormState();
  const {
    data: modDefinitions,
    isLoading: isModDefinitionsLoading,
    error: modDefinitionsError,
  } = useAllModDefinitions();
  const { data: editablePackages, isLoading: isEditablePackagesLoading } =
    useGetEditablePackagesQuery();
  const [updateMod] = useUpdateRecipeMutation();
  const modComponentFormStates = useSelector(selectElements);
  const isDirtyByModComponentId = useSelector(selectDirty);
  const activatedModComponents = useSelector(selectExtensions);
  const allDirtyModOptions = useSelector(selectDirtyRecipeOptionDefinitions);
  const allDirtyModMetadatas = useSelector(selectDirtyRecipeMetadata);
  const deletedComponentsByModId = useSelector(selectDeletedElements);
  const { showConfirmation } = useModals();
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Save a mod's components, options, and metadata
   * Throws errors for various bad states
   * @return boolean indicating successful save
   */
  async function save(modId: RegistryId): Promise<boolean> {
    const modDefinition = modDefinitions?.find(
      (mod) => mod.metadata.id === modId,
    );
    if (modDefinition == null) {
      throw new Error(
        "You no longer have edit permissions for the mod. Please reload the Page Editor.",
      );
    }

    if (!isModEditable(editablePackages, modDefinition)) {
      dispatch(editorActions.showSaveAsNewRecipeModal());
      return false;
    }

    const confirm = await showConfirmation({
      title: "Save Mod?",
      message: "All changes to the mod will be saved",
      submitCaption: "Save",
      submitVariant: "primary",
    });

    if (!confirm) {
      return false;
    }

    // eslint-disable-next-line security/detect-object-injection -- mod IDs are sanitized in the form validation
    const deletedModComponentFormStates = deletedComponentsByModId[modId] ?? [];
    const deletedModComponentIds = new Set(
      deletedModComponentFormStates.map(({ uuid }) => uuid),
    );

    const dirtyModComponentFormStates = modComponentFormStates.filter(
      (modComponentFormState) =>
        modComponentFormState.recipe?.id === modId &&
        isDirtyByModComponentId[modComponentFormState.uuid] &&
        !deletedModComponentIds.has(modComponentFormState.uuid),
    );

    // XXX: this might need to come before the confirmation modal in order to avoid timout if the user takes too
    // long to confirm?
    // Check permissions as early as possible
    void ensureElementPermissionsFromUserGesture(dirtyModComponentFormStates);

    const cleanModComponents = activatedModComponents.filter(
      (modComponent) =>
        modComponent._recipe?.id === modId &&
        !dirtyModComponentFormStates.some(
          (modComponentFormState) =>
            modComponentFormState.uuid === modComponent.id,
        ) &&
        !deletedModComponentIds.has(modComponent.id),
    );

    // Dirty options/metadata or null if there are no staged changes.
    // eslint-disable-next-line security/detect-object-injection -- mod IDs are sanitized in the form validation
    const dirtyModOptions = allDirtyModOptions[modId];
    // eslint-disable-next-line security/detect-object-injection -- mod IDs are sanitized in the form validation
    const dirtyModMetadata = allDirtyModMetadatas[modId];

    const newMod = buildNewMod({
      sourceMod: modDefinition,
      cleanModComponents,
      dirtyModComponentFormStates,
      dirtyModOptions,
      dirtyModMetadata,
    });

    const packageId = editablePackages.find(
      // Bricks endpoint uses "name" instead of id
      (x) => x.name === newMod.metadata.id,
    )?.id;

    const upsertResponse = await updateMod({
      packageId,
      recipe: newMod,
    }).unwrap();

    const newModMetadata = selectRecipeMetadata(newMod, upsertResponse);

    // Don't push to cloud since we're saving it with the mod
    await Promise.all(
      dirtyModComponentFormStates.map(async (modComponentFormState) =>
        upsertModComponentFormState({
          element: modComponentFormState,
          options: {
            pushToCloud: false,
            // Permissions were already checked earlier in the save function here
            checkPermissions: false,
            // Notified and reactivated once in safeSave below
            notifySuccess: false,
            reactivateEveryTab: false,
          },
          modId: newModMetadata.id,
        }),
      ),
    );

    // Update the mod metadata on mod components in the options slice
    dispatch(optionsActions.updateRecipeMetadataForExtensions(newModMetadata));

    // Update the mod metadata on mod component form states in the page editor slice
    dispatch(editorActions.updateRecipeMetadataForElements(newModMetadata));

    // Remove any deleted mod component form states from the extensions slice
    for (const modComponentId of deletedModComponentIds) {
      dispatch(optionsActions.removeExtension({ extensionId: modComponentId }));
    }

    // Clear the dirty states
    dispatch(editorActions.resetMetadataAndOptionsForRecipe(newModMetadata.id));
    dispatch(editorActions.clearDeletedElementsForRecipe(newModMetadata.id));

    reportEvent(Events.PAGE_EDITOR_MOD_UPDATE, {
      modId: newMod.metadata.id,
    });

    return true;
  }

  async function safeSave(modId: RegistryId) {
    if (modDefinitionsError) {
      notify.error({
        message: "Error fetching mod definitions",
        error: modDefinitionsError,
      });

      return;
    }

    if (isModDefinitionsLoading || isEditablePackagesLoading) {
      return;
    }

    setIsSaving(true);
    try {
      const success = await save(modId);
      if (success) {
        notify.success("Saved mod");
        reactivateEveryTab();
      }
    } catch (error: unknown) {
      notify.error({
        message: "Failed saving mod",
        error,
      });
    } finally {
      setIsSaving(false);
    }
  }

  return {
    save: safeSave,
    isSaving,
  };
}

export default useSaveMod;
