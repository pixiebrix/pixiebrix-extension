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
  PACKAGE_REGEX,
  testIsSemVerString,
  validateRegistryId,
  normalizeSemVerString,
} from "@/types/helpers";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveModComponentFormState,
  selectActiveModId,
  selectDirtyMetadataForModId,
  selectEditorModalVisibilities,
} from "@/pageEditor/slices/editorSelectors";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
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
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
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
} from "@/pageEditor/pageEditorTypes";
import { type RegistryId } from "@/types/registryTypes";
import { generatePackageId } from "@/utils/registryUtils";
import { FieldDescriptions } from "@/modDefinitions/modDefinitionConstants";
import useCreateModFromModComponent from "@/pageEditor/hooks/useCreateModFromModComponent";
import useCreateModFromMod from "@/pageEditor/hooks/useCreateModFromMod";

function useInitialFormState({
  activeMod,
  activeModComponentFormState,
}: {
  activeModComponentFormState: ModComponentFormState;
  activeMod: ModDefinition | null;
}): ModMetadataFormState | null {
  const scope = useSelector(selectScope);

  const activeModId =
    activeModComponentFormState?.recipe?.id ?? activeMod?.metadata?.id;
  const dirtyModMetadata = useSelector(
    selectDirtyMetadataForModId(activeModId),
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
      version: normalizeSemVerString("1.0.0"),
      description: modMetadata.description,
    };
  }

  // Handle creating a new mod from a selected mod component
  if (activeModComponentFormState) {
    return {
      id: generatePackageId(scope, activeModComponentFormState.label),
      name: activeModComponentFormState.label,
      version: normalizeSemVerString("1.0.0"),
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
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  const { createModFromMod } = useCreateModFromMod();
  const { createModFromComponent } = useCreateModFromModComponent(
    activeModComponentFormState,
  );

  // `selectActiveModId` returns the mod id if a mod is selected. Assumption: if the CreateModal
  // is open, and a mod is active, then we're performing a "Save as New" on that mod.
  const directlyActiveModId = useSelector(selectActiveModId);
  const activeModId =
    directlyActiveModId ?? activeModComponentFormState?.recipe?.id;
  const { data: activeMod, isFetching: isRecipeFetching } =
    useOptionalModDefinition(activeModId);

  const formSchema = useFormSchema();

  const hideModal = useCallback(() => {
    dispatch(editorActions.hideModalIfShowing(ModalKey.CREATE_MOD));
  }, [dispatch]);

  const initialModMetadataFormState = useInitialFormState({
    activeModComponentFormState,
    activeMod,
  });

  const onSubmit: OnSubmit<ModMetadataFormState> = async (values, helpers) => {
    try {
      // `activeMod` must come first. It's possible that both activeModComponentFormState and activeMod are set because
      // activeMod will be the mod of the active mod component if in a "Save as New" workflow for an existing mod
      if (activeMod) {
        await createModFromMod(activeMod, values);
      } else if (activeModComponentFormState) {
        await createModFromComponent(activeModComponentFormState, values);
      } else {
        // Should not happen in practice
        // noinspection ExceptionCaughtLocallyJS
        throw new Error("Expected either active mod component or mod");
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
        showUntouchedErrors
        as={RegistryIdWidget}
      />
      <ConnectedFieldTemplate
        name="name"
        label="Name"
        widerLabel
        description={FieldDescriptions.MOD_NAME}
        showUntouchedErrors
      />
      <ConnectedFieldTemplate
        name="version"
        label="Version"
        widerLabel
        description={FieldDescriptions.MOD_VERSION}
        showUntouchedErrors
      />
      <ConnectedFieldTemplate
        name="description"
        label="Description"
        widerLabel
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
  const { isCreateModModalVisible: show } = useSelector(
    selectEditorModalVisibilities,
  );

  const dispatch = useDispatch();
  const hideModal = useCallback(() => {
    dispatch(editorActions.hideModalIfShowing(ModalKey.CREATE_MOD));
  }, [dispatch]);

  return (
    <ModalLayout title="Create new mod" show={show} onHide={hideModal}>
      <CreateModModalBody />
    </ModalLayout>
  );
};

export default CreateModModal;
