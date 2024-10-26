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

import React, { useCallback } from "react";
import {
  isInnerDefinitionRegistryId,
  normalizeSemVerString,
  PACKAGE_REGEX,
  testIsSemVerString,
  validateRegistryId,
} from "@/types/helpers";
import { useDispatch, useSelector } from "react-redux";
import {
  getModalDataSelector,
  selectActiveModComponentFormState,
  selectCurrentModId,
  selectDirtyMetadataForModId,
  selectEditorModalVisibilities,
  selectFirstModComponentFormStateForActiveMod,
} from "@/pageEditor/store/editor/editorSelectors";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { Button, Modal } from "react-bootstrap";
import { selectScope } from "@/auth/authSelectors";
import { generateScopeBrickId } from "@/pageEditor/panes/save/saveHelpers";
import { RequireScope } from "@/auth/RequireScope";
import Form, {
  type OnSubmit,
  type RenderBody,
  type RenderSubmit,
} from "@/components/form/Form";
import notify from "@/utils/notify";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { object, string } from "yup";
import RegistryIdWidget from "@/components/form/widgets/RegistryIdWidget";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import {
  useAllModDefinitions,
  useOptionalModDefinition,
} from "@/modDefinitions/modDefinitionHooks";
import Loader from "@/components/Loader";
import ModalLayout from "@/components/ModalLayout";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import {
  ModalKey,
  type ModMetadataFormState,
} from "@/pageEditor/store/editor/pageEditorTypes";
import { type RegistryId } from "@/types/registryTypes";
import { generatePackageId } from "@/utils/registryUtils";
import { FieldDescriptions } from "@/modDefinitions/modDefinitionConstants";
import useCreateModFromModComponent from "@/pageEditor/hooks/useCreateModFromModComponent";
import useCreateModFromMod from "@/pageEditor/hooks/useCreateModFromMod";
import { assertNotNullish } from "@/utils/nullishUtils";
import useIsMounted from "@/hooks/useIsMounted";
import useCreateModFromUnsavedMod from "@/pageEditor/hooks/useCreateModFromUnsavedMod";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { isSpecificError } from "@/errors/errorHelpers";
import { DataIntegrityError } from "@/pageEditor/hooks/useBuildAndValidateMod";

/**
 * Hook to get the initial form state for the Create Mod modal.
 *
 * @param activeMod The mod definition fetched from the server for the active mod, if it could be found on the server
 * @param activeModId The mod id for the active mod, if a mod is selected
 * @param activeModComponentFormState The form state for the active mod component, if a mod component is selected
 */
function useInitialFormState({
  activeModDefinition,
  activeModId,
  activeModComponentFormState,
}: {
  // This is only used locally in this module in one place, and we want to make sure all inputs are being passed in, even if they are undefined
  activeModDefinition: ModDefinition | undefined;
  activeModId: RegistryId;
  activeModComponentFormState: ModComponentFormState | undefined;
}): ModMetadataFormState | UnknownObject {
  const userScope = useSelector(selectScope);
  assertNotNullish(
    userScope,
    "Expected scope, should be nested in RequireScope",
  );

  const firstComponentFormStateForActiveMod = useSelector(
    selectFirstModComponentFormStateForActiveMod,
  );
  const dirtyModMetadata = useSelector(
    selectDirtyMetadataForModId(activeModId),
  );
  const modMetadata =
    // If the mod metadata has been edited, it can be found in the dirty metadata state
    dirtyModMetadata ??
    // If an active mod that has been saved to the server already is selected, use its metadata
    activeModDefinition?.metadata ??
    // If the mod definition has not been created on the server yet, use the metadata from the first component form state of the selected mod
    firstComponentFormStateForActiveMod?.modMetadata ??
    // If the mod is not selected, use the metadata from the active mod component form state
    activeModComponentFormState?.modMetadata;

  if (!modMetadata) {
    return {};
  }

  const isUnsavedMod = isInnerDefinitionRegistryId(modMetadata.id);
  let newModId = isUnsavedMod
    ? // If the mod is a brand new, unsaved mod, generate a new package id
      generatePackageId(userScope, modMetadata.name)
    : // If the mod is an existing mod, generate a new package id with the existing mod id and the user's scope
      generateScopeBrickId(userScope, modMetadata.id);
  if (newModId === modMetadata.id) {
    newModId = validateRegistryId(newModId + "-copy");
  }

  return {
    id: newModId,
    name: isUnsavedMod ? modMetadata.name : `${modMetadata.name} (Copy)`,
    version: isUnsavedMod
      ? modMetadata.version
      : normalizeSemVerString("1.0.0"),
    description: modMetadata.description,
  };
}

function useFormSchema() {
  const { data: modDefinitions } = useAllModDefinitions();
  const allModIds: RegistryId[] = (modDefinitions ?? []).map(
    (x) => x.metadata.id,
  );

  // TODO: This should be yup.SchemaOf<ModMetadataFormState> but we can't set the `id` property to `RegistryId`
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
  const isMounted = useIsMounted();

  const currentModId = useSelector(selectCurrentModId);
  assertNotNullish(currentModId, "Expected mod or mod component to be active");

  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  const modalData = useSelector(getModalDataSelector(ModalKey.CREATE_MOD));

  const { createModFromMod } = useCreateModFromMod();
  const { createModFromUnsavedMod } = useCreateModFromUnsavedMod();
  const { createModFromComponent } = useCreateModFromModComponent();

  const { data: modDefinition, isFetching: isModDefinitionFetching } =
    useOptionalModDefinition(currentModId);

  const formSchema = useFormSchema();

  const hideModal = useCallback(() => {
    dispatch(editorActions.hideModal());
  }, [dispatch]);

  const initialModMetadataFormState = useInitialFormState({
    activeModDefinition: modDefinition,
    activeModId: currentModId,
    activeModComponentFormState,
  });

  const onSubmit: OnSubmit<ModMetadataFormState> = async (values, helpers) => {
    if (isModDefinitionFetching) {
      helpers.setSubmitting(false);
      return;
    }

    assertNotNullish(modalData, "Expected modal data to be defined");

    try {
      if ("sourceModComponentId" in modalData) {
        assertNotNullish(
          activeModComponentFormState,
          "Expected active mod component form state",
        );
        await createModFromComponent(
          activeModComponentFormState,
          values,
          modalData,
        );
      } else if (
        isInnerDefinitionRegistryId(modalData.sourceModId) ||
        modDefinition == null
      ) {
        // Handle "Save As" case where the mod is unsaved or the user no longer has access to the mod definition
        assertNotNullish(
          currentModId,
          "Expected mod to be selected in the editor",
        );
        await createModFromUnsavedMod(currentModId, values);
      } else {
        await createModFromMod(modDefinition, values, modalData);
      }

      notify.success({
        message: "Mod created successfully",
      });

      hideModal();
    } catch (error) {
      if (isSpecificError(error, DataIntegrityError)) {
        dispatch(editorActions.showSaveDataIntegrityErrorModal());
        return;
      }

      if (isSingleObjectBadRequestError(error) && error.response.data.config) {
        helpers.setStatus(error.response.data.config);
        return;
      }

      notify.error({
        message: "Error creating mod",
        error,
      });
    } finally {
      if (isMounted()) {
        helpers.setSubmitting(false);
      }
    }
  };

  const renderBody: RenderBody = () => (
    <Modal.Body>
      <ConnectedFieldTemplate
        name="id"
        label="Mod ID"
        id="create-mod-modal-id"
        description={FieldDescriptions.MOD_ID}
        showUntouchedErrors
        as={RegistryIdWidget}
      />
      <ConnectedFieldTemplate
        name="name"
        label="Name"
        id="create-mod-modal-name"
        description={FieldDescriptions.MOD_NAME}
        showUntouchedErrors
      />
      <ConnectedFieldTemplate
        name="version"
        label="Version"
        id="create-mod-modal-version"
        description={FieldDescriptions.MOD_VERSION}
        showUntouchedErrors
      />
      <ConnectedFieldTemplate
        name="description"
        label="Description"
        id="create-mod-modal-description"
        description={FieldDescriptions.MOD_DESCRIPTION}
        showUntouchedErrors
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
        Save
      </Button>
    </Modal.Footer>
  );

  return (
    <>
      {isModDefinitionFetching ? (
        <Loader />
      ) : (
        <Form
          validationSchema={formSchema}
          validateOnMount
          initialValues={initialModMetadataFormState}
          onSubmit={onSubmit}
          renderBody={renderBody}
          renderSubmit={renderSubmit}
        />
      )}
    </>
  );
};

const CreateModModal: React.FunctionComponent = () => {
  const { isCreateModModalVisible: show } = useSelector(
    selectEditorModalVisibilities,
  );

  const dispatch = useDispatch();
  const hideModal = useCallback(() => {
    dispatch(editorActions.hideModal());
  }, [dispatch]);

  return (
    <ModalLayout title="Save new mod" show={show} onHide={hideModal}>
      <RequireScope scopeSettingsDescription="To create a mod, you must first set an account alias for your PixieBrix account">
        <CreateModModalBody />
      </RequireScope>
    </ModalLayout>
  );
};

export default CreateModModal;
