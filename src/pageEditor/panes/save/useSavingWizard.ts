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

import { actions as savingExtensionActions } from "./savingExtensionSlice";
import { useDispatch, useSelector } from "react-redux";
import { selectIsSaving, selectIsWizardOpen } from "./savingExtensionSelectors";
import {
  selectActiveModComponentFormState,
  selectModComponentFormStates,
} from "@/pageEditor/slices/editorSelectors";
import useUpsertModComponentFormState from "@/pageEditor/hooks/useUpsertModComponentFormState";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import useResetExtension from "@/pageEditor/hooks/useResetExtension";
import {
  type Metadata,
  type RegistryId,
  type SemVerString,
} from "@/types/registryTypes";
import notify from "@/utils/notify";
import { selectActivatedModComponents } from "@/store/extensionsSelectors";
import {
  useCreateModDefinitionMutation,
  useGetEditablePackagesQuery,
  useUpdateModDefinitionMutation,
} from "@/data/service/api";
import { replaceModComponent } from "./saveHelpers";
import extensionsSlice from "@/store/extensionsSlice";
import pDefer, { type DeferredPromise } from "p-defer";
import { type PackageUpsertResponse } from "@/types/contract";
import { pick } from "lodash";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { useAllModDefinitions } from "@/modDefinitions/modDefinitionHooks";
import {
  type ModComponentBase,
  type ActivatedModComponent,
} from "@/types/modComponentTypes";
import { type UnsavedModDefinition } from "@/types/modDefinitionTypes";

const { actions: optionsActions } = extensionsSlice;

type ModConfiguration = {
  id: RegistryId;
  name: string;
  version?: SemVerString;
  description?: string;
};

let savingDeferred: DeferredPromise<void>;

export function selectModMetadata(
  unsavedModDefinition: UnsavedModDefinition,
  response: PackageUpsertResponse,
): ModComponentBase["_recipe"] {
  return {
    ...unsavedModDefinition.metadata,
    sharing: pick(response, ["public", "organizations"]),
    ...pick(response, ["updated_at"]),
  };
}

const useSavingWizard = () => {
  const dispatch = useDispatch();
  const upsertModComponentFormState = useUpsertModComponentFormState();
  const reset = useResetExtension();
  const isWizardOpen = useSelector(selectIsWizardOpen);
  const isSaving = useSelector(selectIsSaving);
  const activatedModComponents = useSelector(selectActivatedModComponents);
  const modComponentFormStates = useSelector(selectModComponentFormStates);
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );

  const { data: modDefinitions } = useAllModDefinitions();
  const { data: editablePackages } = useGetEditablePackagesQuery();
  const [createMod] = useCreateModDefinitionMutation();
  const [updateMod] = useUpdateModDefinitionMutation();

  const save = async () => {
    if (activeModComponentFormState.recipe == null) {
      void saveUnpackagedModComponent();
    } else {
      // The user might lose access to the mod while they were editing it (the mod or a mod component)
      // See https://github.com/pixiebrix/pixiebrix-extension/issues/2813
      const modDefinition = modDefinitions.find(
        (x) => x.metadata.id === activeModComponentFormState.recipe.id,
      );
      if (!modDefinition) {
        notify.error(
          "You no longer have edit permissions for the mod. Please reload the Page Editor.",
        );
        return;
      }
    }

    savingDeferred = pDefer<void>();

    dispatch(savingExtensionActions.openWizard());
    return savingDeferred.promise;
  };

  /**
   * Saves a mod component that is not a part of a mod
   */
  async function saveUnpackagedModComponent() {
    dispatch(savingExtensionActions.setSavingInProgress());
    const error = await upsertModComponentFormState({
      modComponentFormState: activeModComponentFormState,
      options: {
        pushToCloud: true,
        checkPermissions: true,
        notifySuccess: true,
        reactivateEveryTab: true,
      },
    });
    closeWizard(error);
  }

  /**
   * Creates personal mod component from a mod component form state in the Page Editor.
   */
  const saveAsPersonalModComponent = async () => {
    dispatch(savingExtensionActions.setSavingInProgress());

    // Stripping the mod-related data from the mod component form state
    const { recipe, optionsDefinition, ...rest } = activeModComponentFormState;
    const personalModComponentFormState: ModComponentFormState = {
      ...rest,
      uuid: uuidv4(),
      // Detach from the mod
      recipe: undefined,
    };

    dispatch(
      editorActions.addModComponentFormState(personalModComponentFormState),
    );
    await reset({
      extensionId: activeModComponentFormState.uuid,
      shouldShowConfirmation: false,
    });

    const error = await upsertModComponentFormState({
      modComponentFormState: personalModComponentFormState,
      options: {
        pushToCloud: true,
        // Should already have permissions because it already exists
        checkPermissions: false,
        notifySuccess: true,
        reactivateEveryTab: true,
      },
    });

    if (!error) {
      dispatch(
        editorActions.removeModComponentFormState(
          activeModComponentFormState.uuid,
        ),
      );
      dispatch(
        optionsActions.removeModComponent({
          modComponentId: activeModComponentFormState.uuid,
        }),
      );
    }

    closeWizard(error);
  };

  /**
   * 1. Creates new mod,
   * 2. Updates all mod components of the old mod to point to the new one, and
   * 3. Saves the changes of the form state.
   */
  const saveFormStateAndCreateNewMod = async (modMeta: ModConfiguration) => {
    dispatch(savingExtensionActions.setSavingInProgress());

    const modComponentModMeta = activeModComponentFormState.recipe;
    const modDefinition = modDefinitions.find(
      (x) => x.metadata.id === modComponentModMeta.id,
    );

    if (modMeta.id === modDefinition.metadata.id) {
      closeWizard("You must provide a new id for the mod");
      return;
    }

    const newMeta: Metadata = {
      ...modMeta,
      id: validateRegistryId(modMeta.id),
    };

    const newModDefinition: UnsavedModDefinition = replaceModComponent(
      modDefinition,
      newMeta,
      activatedModComponents,
      activeModComponentFormState,
    );

    const createModResponse = await createMod({
      modDefinition: newModDefinition,
      // Don't share with anyone (only the author will have access)
      organizations: [],
      public: false,
    });

    if ("error" in createModResponse) {
      const errorMessage = "Failed to create new mod";
      notify.error({
        message: errorMessage,
        error: createModResponse.error,
      });
      closeWizard(errorMessage);
      return;
    }

    const createExtensionError = await upsertModComponentFormState({
      modComponentFormState: activeModComponentFormState,
      options: {
        // `pushToCloud` to false because we don't want to save a copy of the individual extension to the user's account
        // because it will already be available via the blueprint
        pushToCloud: false,
        checkPermissions: true,
        notifySuccess: true,
        reactivateEveryTab: true,
      },
      modId: newModDefinition.metadata.id,
    });

    if (createExtensionError) {
      closeWizard(createExtensionError);
      return;
    }

    updateComponentModDefinitionLinks(
      modDefinition.metadata.id,
      selectModMetadata(newModDefinition, createModResponse.data),
      // Unlink the installed extensions from the deployment
      { _deployment: null as ModComponentBase["_deployment"] },
    );

    closeWizard(createExtensionError);
  };

  /**
   * 1. Updates new mod,
   * 2. Updates all mod components of the mod with the new metadata, and
   * 3. Saves the changes of the form state
   */
  const saveElementAndUpdateRecipe = async (recipeMeta: ModConfiguration) => {
    dispatch(savingExtensionActions.setSavingInProgress());

    const modComponentMeta = activeModComponentFormState.recipe;
    const modDefinition = modDefinitions.find(
      (x) => x.metadata.id === modComponentMeta.id,
    );

    const newMod: UnsavedModDefinition = replaceModComponent(
      modDefinition,
      recipeMeta,
      activatedModComponents,
      activeModComponentFormState,
    );

    const packageId = editablePackages.find(
      // Bricks endpoint uses "name" instead of id
      (x) => x.name === newMod.metadata.id,
    )?.id;

    const updateModResponse = await updateMod({
      packageId,
      modDefinition: newMod,
    });

    if ("error" in updateModResponse) {
      const errorMessage = "Failed to update the mod";
      notify.error({
        message: errorMessage,
        error: updateModResponse.error,
      });
      closeWizard(errorMessage);
      return;
    }

    const error = await upsertModComponentFormState({
      modComponentFormState: activeModComponentFormState,
      options: {
        pushToCloud: true,
        checkPermissions: true,
        notifySuccess: true,
        reactivateEveryTab: true,
      },
      modId: newMod.metadata.id,
    });

    if (error) {
      closeWizard(error);
      return;
    }

    updateComponentModDefinitionLinks(
      modDefinition.metadata.id,
      selectModMetadata(newMod, updateModResponse.data),
    );

    closeWizard(error);
  };

  function updateComponentModDefinitionLinks(
    modId: RegistryId,
    modMetadata: ModComponentBase["_recipe"],
    extraUpdate: Partial<ActivatedModComponent> = {},
  ) {
    // 1) Update the mod components in the Redux optionsSlice
    const modComponents = activatedModComponents.filter(
      (x) => x._recipe?.id === modId,
    );

    for (const modComponent of modComponents) {
      const update = {
        id: modComponent.id,
        _recipe: modMetadata,
        ...extraUpdate,
      };

      dispatch(optionsActions.updateModComponent(update));
    }

    // 2) Update the extensions in the Redux editorSlice (the slice for the page editor)
    const formStatesForMod = modComponentFormStates.filter(
      (x) => x.recipe?.id === modId,
    );

    for (const modComponentFormState of formStatesForMod) {
      const propertiesToUpdate = {
        uuid: modComponentFormState.uuid,
        recipe: modMetadata,
      };

      dispatch(
        editorActions.partialUpdateModComponentFormState(propertiesToUpdate),
      );
    }
  }

  function closeWizard(errorMessage?: string | null) {
    dispatch(savingExtensionActions.closeWizard());

    if (savingDeferred) {
      if (errorMessage) {
        savingDeferred.reject(errorMessage);
      } else {
        savingDeferred.resolve();
      }

      savingDeferred = null;
    }
  }

  return {
    isWizardOpen,
    isSaving,
    element: activeModComponentFormState,
    save,
    saveElementAsPersonalExtension: saveAsPersonalModComponent,
    saveElementAndCreateNewRecipe: saveFormStateAndCreateNewMod,
    saveElementAndUpdateRecipe,
    closeWizard,
  };
};

export default useSavingWizard;
