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

import React, { useCallback } from "react";
import {
  PACKAGE_REGEX,
  testIsSemVerString,
  uuidv4,
  validateRegistryId,
  validateSemVerString,
} from "@/types/helpers";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveElement,
  selectActiveRecipeId,
  selectDeletedElements,
  selectDirty,
  selectDirtyMetadataForRecipeId,
  selectDirtyRecipeOptionDefinitions,
  selectEditorModalVisibilities,
  selectElements,
  selectKeepLocalCopyOnCreateRecipe,
} from "@/pageEditor/slices/editorSelectors";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { Button, Modal } from "react-bootstrap";
import { selectScope } from "@/auth/authSelectors";
import {
  buildNewMod,
  generateScopeBrickId,
} from "@/pageEditor/panes/save/saveHelpers";
import { RequireScope } from "@/auth/RequireScope";
import Form, {
  type OnSubmit,
  type RenderBody,
  type RenderSubmit,
} from "@/components/form/Form";
import { useCreateRecipeMutation } from "@/services/api";
import useUpsertModComponentFormState from "@/pageEditor/hooks/useUpsertModComponentFormState";
import extensionsSlice from "@/store/extensionsSlice";
import notify from "@/utils/notify";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { produce } from "immer";
import { object, string } from "yup";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { selectExtensions } from "@/store/extensionsSelectors";
import {
  inferConfiguredModIntegrations,
  inferRecipeOptions,
} from "@/store/extensionsUtils";
import { useRemoveModComponentFromStorage } from "@/pageEditor/hooks/useRemoveModComponentFromStorage";
import useDeactivateMod from "@/pageEditor/hooks/useDeactivateMod";
import RegistryIdWidget from "@/components/form/widgets/RegistryIdWidget";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import { type PackageUpsertResponse } from "@/types/contract";
import { pick } from "lodash";
import {
  useAllModDefinitions,
  useOptionalModDefinition,
} from "@/modDefinitions/modDefinitionHooks";
import Loader from "@/components/Loader";
import ModalLayout from "@/components/ModalLayout";
import {
  type ModDefinition,
  type UnsavedModDefinition,
} from "@/types/modDefinitionTypes";
import { type ModMetadataFormState } from "@/pageEditor/pageEditorTypes";
import { type RegistryId } from "@/types/registryTypes";
import { type ModComponentBase } from "@/types/modComponentTypes";
import { ensureElementPermissionsFromUserGesture } from "@/pageEditor/editorPermissionsHelpers";
import { generatePackageId } from "@/utils/registryUtils";
import { FieldDescriptions } from "@/modDefinitions/modDefinitionConstants";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";

const { actions: modComponentActions } = extensionsSlice;

function selectModMetadata(
  unsavedModDefinition: UnsavedModDefinition,
  response: PackageUpsertResponse,
): ModComponentBase["_recipe"] {
  return {
    ...unsavedModDefinition.metadata,
    sharing: pick(response, ["public", "organizations"]),
    ...pick(response, ["updated_at"]),
  };
}

function useSaveCallbacks({
  activeModComponent,
}: {
  activeModComponent: ModComponentFormState;
}) {
  const dispatch = useDispatch();
  const [createMod] = useCreateRecipeMutation();
  const upsertModComponentFormState = useUpsertModComponentFormState();
  const removeModComponentFromStorage = useRemoveModComponentFromStorage();
  const deactivateMod = useDeactivateMod();

  const editorFormElements = useSelector(selectElements);
  const isDirtyByElementId = useSelector(selectDirty);
  const activatedModComponents = useSelector(selectExtensions);
  const dirtyModOptions = useSelector(selectDirtyRecipeOptionDefinitions);
  const deletedComponentsByModId = useSelector(selectDeletedElements);
  const keepLocalCopy = useSelector(selectKeepLocalCopyOnCreateRecipe);

  const createModFromComponent = useCallback(
    (
      modComponentFormState: ModComponentFormState,
      modMetadata: ModMetadataFormState,
      // eslint-disable-next-line @typescript-eslint/promise-function-async -- permissions check must be called in the user gesture context, `async-await` can break the call chain
    ) =>
      // eslint-disable-next-line promise/prefer-await-to-then -- permissions check must be called in the user gesture context, `async-await` can break the call chain
      ensureElementPermissionsFromUserGesture(modComponentFormState).then(
        async (hasPermissions) => {
          if (!hasPermissions) {
            return;
          }

          let modComponent = produce(activeModComponent, (draft) => {
            draft.uuid = uuidv4();
          });
          const newModDefinition = buildNewMod({
            cleanModComponents: [],
            dirtyModComponentFormStates: [modComponent],
            dirtyModMetadata: modMetadata,
          });
          const upsertResponse = await createMod({
            recipe: newModDefinition,
            organizations: [],
            public: false,
          }).unwrap();
          modComponent = produce(modComponent, (draft) => {
            draft.recipe = selectModMetadata(newModDefinition, upsertResponse);
          });
          dispatch(editorActions.addElement(modComponent));
          await upsertModComponentFormState({
            element: modComponent,
            options: {
              // Don't push to cloud since we're saving it with the recipe
              pushToCloud: false,
              // Permissions are already checked above
              checkPermissions: false,
              // Need to provide user feedback
              notifySuccess: true,
              reactivateEveryTab: true,
            },
            modId: newModDefinition.metadata.id,
          });
          if (!keepLocalCopy) {
            await removeModComponentFromStorage({
              extensionId: activeModComponent.uuid,
            });
          }

          reportEvent(Events.PAGE_EDITOR_MOD_CREATE, {
            modId: newModDefinition.metadata.id,
          });
        },
      ),
    [
      activeModComponent,
      upsertModComponentFormState,
      createMod,
      dispatch,
      keepLocalCopy,
      removeModComponentFromStorage,
    ],
  );

  const createModFromMod = useCallback(
    async (modDefinition: ModDefinition, metadata: ModMetadataFormState) => {
      const modId = modDefinition.metadata.id;
      // eslint-disable-next-line security/detect-object-injection -- recipeId
      const deletedModComponents = deletedComponentsByModId[modId] ?? [];
      const deletedElementIds = new Set(
        deletedModComponents.map(({ uuid }) => uuid),
      );

      const dirtyModComponentFormStates = editorFormElements.filter(
        (modComponentFormState) =>
          modComponentFormState.recipe?.id === modId &&
          isDirtyByElementId[modComponentFormState.uuid] &&
          !deletedElementIds.has(modComponentFormState.uuid),
      );
      const cleanModComponents = activatedModComponents.filter(
        (modComponent) =>
          modComponent._recipe?.id === modId &&
          !dirtyModComponentFormStates.some(
            (element) => element.uuid === modComponent.id,
          ) &&
          !deletedElementIds.has(modComponent.id),
      );
      // eslint-disable-next-line security/detect-object-injection -- new recipe IDs are sanitized in the form validation
      const modOptions = dirtyModOptions[modId];

      const newModDefinition = buildNewMod({
        sourceMod: modDefinition,
        cleanModComponents,
        dirtyModComponentFormStates,
        dirtyModOptions: modOptions,
        dirtyModMetadata: metadata,
      });

      const upsertResponse = await createMod({
        recipe: newModDefinition,
        organizations: [],
        public: false,
      }).unwrap();

      const savedModDefinition: ModDefinition = {
        ...newModDefinition,
        sharing: {
          public: upsertResponse.public,
          organizations: upsertResponse.organizations,
        },
        updated_at: upsertResponse.updated_at,
      };

      if (!keepLocalCopy) {
        await deactivateMod({ modId, shouldShowConfirmation: false });
      }

      const modComponents = [
        ...dirtyModComponentFormStates,
        ...cleanModComponents,
      ];

      dispatch(
        modComponentActions.installMod({
          modDefinition: savedModDefinition,
          configuredDependencies: inferConfiguredModIntegrations(modComponents),
          optionsArgs: inferRecipeOptions(modComponents),
          screen: "pageEditor",
          isReinstall: false,
        }),
      );
      dispatch(editorActions.selectRecipeId(savedModDefinition.metadata.id));

      reportEvent(Events.PAGE_EDITOR_MOD_CREATE, {
        copiedFrom: modId,
        modId: savedModDefinition.metadata.id,
      });
    },
    [
      createMod,
      deletedComponentsByModId,
      dirtyModOptions,
      dispatch,
      editorFormElements,
      activatedModComponents,
      isDirtyByElementId,
      keepLocalCopy,
      deactivateMod,
    ],
  );

  return {
    createModFromComponent,
    createModFromMod,
  };
}

function useInitialFormState({
  activeMod,
  activeElement,
}: {
  activeElement: ModComponentFormState;
  activeMod: ModDefinition | null;
}): ModMetadataFormState | null {
  const scope = useSelector(selectScope);

  const activeModId = activeElement?.recipe?.id ?? activeMod?.metadata?.id;
  const dirtyModMetadata = useSelector(
    selectDirtyMetadataForRecipeId(activeModId),
  );
  const modMetadata = dirtyModMetadata ?? activeMod?.metadata;

  // Handle the "Save As New" case, where an existing recipe, or an
  // extension within an existing recipe, is selected
  if (modMetadata) {
    let newModId = generateScopeBrickId(scope, modMetadata.id);
    if (newModId === modMetadata.id) {
      newModId = validateRegistryId(newModId + "-copy");
    }

    return {
      id: newModId,
      name: `${modMetadata.name} (Copy)`,
      version: validateSemVerString("1.0.0"),
      description: modMetadata.description,
    };
  }

  // Handle creating a new blueprint from a selected extension
  if (activeElement) {
    return {
      id: generatePackageId(scope, activeElement.label),
      name: activeElement.label,
      version: validateSemVerString("1.0.0"),
      description: "Created with the PixieBrix Page Editor",
    };
  }

  return null;
}

function useFormSchema() {
  const { data: modDefinitions } = useAllModDefinitions();
  const allModIds: RegistryId[] = (modDefinitions ?? []).map(
    (x) => x.metadata.id,
  );

  // TODO: This should be yup.SchemaOf<RecipeMetadataFormState> but we can't set the `id` property to `RegistryId`
  // see: https://github.com/jquense/yup/issues/1183#issuecomment-749186432
  return object({
    id: string()
      .matches(
        PACKAGE_REGEX,
        "Mod ID is required, and may only include lowercase letters, numbers, and the symbols - _ ~",
      )
      .notOneOf(allModIds, "Mod ID is already in use")
      .required("Mod ID is required"),
    name: string().required("Name is required"),
    version: string()
      .test(
        "semver",
        "Version must follow the X.Y.Z semantic version format, without a leading 'v'",
        (value: string) => testIsSemVerString(value, { allowLeadingV: false }),
      )
      .required(),
    description: string(),
  });
}

const CreateModModalBody: React.FC = () => {
  const dispatch = useDispatch();

  const activeModComponent = useSelector(selectActiveElement);

  // `selectActiveRecipeId` returns the mod id if a mod is selected. Assumption: if the CreateModal
  // is open, and a mod is active, then we're performing a "Save as New" on that mod.
  const directlyActiveModId = useSelector(selectActiveRecipeId);
  const activeModId = directlyActiveModId ?? activeModComponent?.recipe?.id;
  const { data: activeMod, isFetching: isRecipeFetching } =
    useOptionalModDefinition(activeModId);

  const formSchema = useFormSchema();

  const hideModal = useCallback(() => {
    dispatch(editorActions.hideModal());
  }, [dispatch]);

  const initialModMetadataFormState = useInitialFormState({
    activeElement: activeModComponent,
    activeMod,
  });
  const { createModFromComponent, createModFromMod } = useSaveCallbacks({
    activeModComponent,
  });

  const onSubmit: OnSubmit<ModMetadataFormState> = async (values, helpers) => {
    try {
      // `activeRecipe` must come first. It's possible that both activeElement and activeRecipe are set because
      // activeRecipe will be the recipe of the active element if in a "Save as New" workflow for an existing recipe
      if (activeMod) {
        await createModFromMod(activeMod, values);
      } else if (activeModComponent) {
        await createModFromComponent(activeModComponent, values);
      } else {
        // Should not happen in practice
        // noinspection ExceptionCaughtLocallyJS
        throw new Error("Expected either active element or mod");
      }

      hideModal();
    } catch (error) {
      if (isSingleObjectBadRequestError(error) && error.response.data.config) {
        helpers.setStatus(error.response.data.config);
        return;
      }

      notify.error({
        message: "Error creating mod",
        error,
      });
    } finally {
      helpers.setSubmitting(false);
    }
  };

  const renderBody: RenderBody = () => (
    <Modal.Body>
      <ConnectedFieldTemplate
        name="id"
        label="Mod ID"
        description={FieldDescriptions.MOD_ID}
        widerLabel
        as={RegistryIdWidget}
      />
      <ConnectedFieldTemplate
        name="name"
        label="Name"
        widerLabel
        description={FieldDescriptions.MOD_NAME}
      />
      <ConnectedFieldTemplate
        name="version"
        label="Version"
        widerLabel
        description={FieldDescriptions.MOD_VERSION}
      />
      <ConnectedFieldTemplate
        name="description"
        label="Description"
        widerLabel
        description={FieldDescriptions.MOD_DESCRIPTION}
      />
    </Modal.Body>
  );

  const renderSubmit: RenderSubmit = ({ isSubmitting, isValid }) => (
    <Modal.Footer>
      <Button variant="info" onClick={hideModal}>
        Cancel
      </Button>
      <Button
        variant="primary"
        type="submit"
        disabled={!isValid || isSubmitting}
      >
        Create
      </Button>
    </Modal.Footer>
  );

  return (
    <RequireScope scopeSettingsDescription="To create a mod, you must first set an account alias for your PixieBrix account">
      {isRecipeFetching ? (
        <Loader />
      ) : (
        <Form
          validationSchema={formSchema}
          showUntouchedErrors
          validateOnMount
          initialValues={initialModMetadataFormState}
          onSubmit={onSubmit}
          renderBody={renderBody}
          renderSubmit={renderSubmit}
        />
      )}
    </RequireScope>
  );
};

const CreateModModal: React.FunctionComponent = () => {
  const { isCreateRecipeModalVisible: show } = useSelector(
    selectEditorModalVisibilities,
  );

  const dispatch = useDispatch();
  const hideModal = useCallback(() => {
    dispatch(editorActions.hideModal());
  }, [dispatch]);

  return (
    <ModalLayout title="Create new mod" show={show} onHide={hideModal}>
      <CreateModModalBody />
    </ModalLayout>
  );
};

export default CreateModModal;
