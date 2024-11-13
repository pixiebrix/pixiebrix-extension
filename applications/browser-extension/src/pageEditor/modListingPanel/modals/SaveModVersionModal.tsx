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
import { testIsSemVerString } from "@/types/helpers";
import { useDispatch, useSelector } from "react-redux";
import {
  getModalDataSelector,
  selectEditorModalVisibilities,
  selectGetDraftModComponentsForMod,
  selectGetModDraftStateForModId,
} from "@/pageEditor/store/editor/editorSelectors";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { Button, Modal } from "react-bootstrap";
import Form, {
  type OnSubmit,
  type RenderBody,
  type RenderSubmit,
} from "@/components/form/Form";
import notify from "@/utils/notify";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import * as Yup from "yup";
import { isSingleObjectBadRequestError } from "@/errors/networkErrorHelpers";
import { useOptionalModDefinition } from "@/modDefinitions/modDefinitionHooks";
import ModalLayout from "@/components/ModalLayout";
import {
  ModalKey,
  type ModMetadataFormState,
} from "@/pageEditor/store/editor/pageEditorTypes";
import { type RegistryId, type SemVerString } from "@/types/registryTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import useIsMounted from "@/hooks/useIsMounted";
import { isSpecificError } from "@/errors/errorHelpers";
import useBuildAndValidateMod, {
  DataIntegrityError,
} from "@/pageEditor/hooks/useBuildAndValidateMod";
import { gt } from "semver";
import { ensureModComponentFormStatePermissionsFromUserGesture } from "@/pageEditor/editorPermissionsHelpers";
import {
  isModComponentFormState,
  mapModDefinitionUpsertResponseToModDefinition,
} from "@/pageEditor/utils";
import updateReduxForSavedModDefinition from "@/pageEditor/hooks/updateReduxForSavedModDefinition";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { isNullOrBlank } from "@/utils/stringUtils";
import {
  useGetEditablePackagesQuery,
  useUpdateModDefinitionMutation,
} from "@/data/service/api";
import { type AppDispatch } from "@/pageEditor/store/store";

type SaveVersionFormValues = {
  version: SemVerString;
  message: string;
};

function useInitialFormState(modId: RegistryId): SaveVersionFormValues {
  const getModDraftStateForModId = useSelector(selectGetModDraftStateForModId);
  const draftState = getModDraftStateForModId(modId);

  return {
    version: draftState.modMetadata.version,
    message: "",
  };
}

function useFormSchema(modId: RegistryId) {
  const { data: modDefinition } = useOptionalModDefinition(modId);
  const serverVersion = modDefinition?.metadata.version;
  assertNotNullish(serverVersion, "Expected version");

  return Yup.object({
    version: Yup.string()
      .test(
        "semver",
        "Version must follow the X.Y.Z semantic version format, without a leading 'v'",
        (value: string) => testIsSemVerString(value, { allowLeadingV: false }),
      )
      .test(
        "increment",
        "You must increment the version number when providing a message.",
        (value: string, testContext) => {
          if (
            // Only enforce
            isNullOrBlank(testContext.parent.message) ||
            // Backend also performs a check
            serverVersion == null ||
            // Let other rule catch for better message
            testIsSemVerString(value, { allowLeadingV: false })
          ) {
            return true;
          }

          return gt(value, serverVersion);
        },
      )
      .required(),
    message: Yup.string(),
  });
}

const SaveModVersionModalBody: React.VFC<{ onHide: () => void }> = ({
  onHide,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const isMounted = useIsMounted();

  const { data: editablePackages = [] } = useGetEditablePackagesQuery();
  const [updateModDefinitionOnServer] = useUpdateModDefinitionMutation();

  const getDraftModComponentsForMod = useSelector(
    selectGetDraftModComponentsForMod,
  );
  const getModDraftStateForModId = useSelector(selectGetModDraftStateForModId);
  const { buildAndValidateMod } = useBuildAndValidateMod();

  const modalData = useSelector(
    getModalDataSelector(ModalKey.SAVE_MOD_VERSION),
  );
  assertNotNullish(
    modalData,
    "SaveModVersionModalBody rendered without modal data set",
  );
  const { modId, sourceModDefinition } = modalData;

  const formSchema = useFormSchema(modId);
  const initialFormState = useInitialFormState(modId);

  const onSubmit: OnSubmit<ModMetadataFormState> = async (values, helpers) => {
    try {
      const draftModComponents = getDraftModComponentsForMod(modId);
      const draftModState = getModDraftStateForModId(modId);

      await ensureModComponentFormStatePermissionsFromUserGesture(
        draftModComponents.filter((x) => isModComponentFormState(x)),
      );

      const unsavedModDefinition = await buildAndValidateMod({
        sourceModDefinition,
        draftModComponents,
        dirtyModMetadata: {
          ...draftModState.modMetadata,
          version: values.version,
        },
        dirtyModOptionsDefinition: draftModState.dirtyModOptionsDefinition,
        dirtyModVariablesDefinition: draftModState.variablesDefinition,
      });

      const packageId = editablePackages.find(
        // Bricks endpoint uses "name" instead of id
        (x) => x.name === modId,
      )?.id;

      assertNotNullish(
        packageId,
        "Package ID is required to upsert a mod definition",
      );

      const upsertResponse = await updateModDefinitionOnServer({
        packageId,
        modDefinition: unsavedModDefinition,
      }).unwrap();

      await dispatch(
        updateReduxForSavedModDefinition({
          modIdToReplace: modId,
          modDefinition: mapModDefinitionUpsertResponseToModDefinition(
            unsavedModDefinition,
            upsertResponse,
          ),
          draftModComponents,
          isReactivate: true,
        }),
      );

      reportEvent(Events.PAGE_EDITOR_MOD_UPDATE, {
        modId,
      });

      onHide();
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
        message: "Error saving mod",
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
        name="version"
        label="Version"
        id="save-mod-modal-version"
        description="The new version of the mod. Must follow the MAJOR.MINOR.PATCH semantic version format."
        showUntouchedErrors
      />
      <ConnectedFieldTemplate
        name="message"
        label="Message"
        id="save-mod-modal-message"
        as="textarea"
        description="A short description of the changes to the mod. If you provide a message, you must increment the version."
        showUntouchedErrors
      />
    </Modal.Body>
  );

  const renderSubmit: RenderSubmit = ({ isSubmitting, isValid }) => (
    <Modal.Footer>
      <Button variant="info" onClick={onHide}>
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
    <Form
      validationSchema={formSchema}
      validateOnMount
      initialValues={initialFormState}
      onSubmit={onSubmit}
      renderBody={renderBody}
      renderSubmit={renderSubmit}
    />
  );
};

/**
 * Modal for saving a new version of an existing mod.
 */
const SaveModVersionModal: React.VFC = () => {
  const dispatch = useDispatch();

  const { isSaveModVersionModalVisible: show } = useSelector(
    selectEditorModalVisibilities,
  );

  const hideModal = useCallback(() => {
    dispatch(editorActions.hideModal());
  }, [dispatch]);

  return (
    <ModalLayout title="Save Mod" show={show} onHide={hideModal}>
      {show && <SaveModVersionModalBody onHide={hideModal} />}
    </ModalLayout>
  );
};

export default SaveModVersionModal;
