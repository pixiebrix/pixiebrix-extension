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

import React, { useCallback, useMemo } from "react";
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
import ModalLayout from "@/components/ModalLayout";
import { ModalKey } from "@/pageEditor/store/editor/pageEditorTypes";
import { type SemVerString } from "@/types/registryTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import useIsMounted from "@/hooks/useIsMounted";
import { isSpecificError } from "@/errors/errorHelpers";
import useBuildAndValidateMod, {
  DataIntegrityError,
} from "@/pageEditor/hooks/useBuildAndValidateMod";
import { gte } from "semver";
import { ensureModComponentFormStatePermissionsFromUserGesture } from "@/pageEditor/editorPermissionsHelpers";
import {
  isModComponentFormState,
  mapModDefinitionUpsertResponseToModDefinition,
} from "@/pageEditor/utils";
import updateReduxForSavedModDefinition from "@/pageEditor/hooks/updateReduxForSavedModDefinition";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { useUpdateModDefinitionMutation } from "@/data/service/api";
import { type AppDispatch } from "@/pageEditor/store/store";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { patchIncrement, testIsSemVerString } from "@/types/semVerHelpers";

type SaveVersionFormValues = {
  version: SemVerString;
  message: string;
};

function useInitialFormState(
  sourceModDefinition: ModDefinition,
): SaveVersionFormValues {
  const modId = sourceModDefinition.metadata.id;
  const getModDraftStateForModId = useSelector(selectGetModDraftStateForModId);
  const draftState = getModDraftStateForModId(modId);

  const serverVersion = sourceModDefinition.metadata.version;
  const draftVersion = draftState.modMetadata.version;

  // Don't need to wrap in useMemo because only the initial render is used
  return {
    version:
      draftVersion === serverVersion
        ? // In the future, could be smarter here and increment major/minor version on:
          // - Major changes: known breaking changes (e.g., a new required mod option, a new integration configuration)
          // - Minor changes: new features, e.g., a new mod component
          patchIncrement(serverVersion)
        : draftVersion,
    message: "",
  };
}

function useFormSchema(sourceModDefinition: ModDefinition) {
  const serverVersion = sourceModDefinition.metadata.version;

  return useMemo(
    () =>
      Yup.object({
        version: Yup.string()
          .test(function (value) {
            if (value == null) {
              return true;
            }

            if (!testIsSemVerString(value)) {
              return this.createError({
                message:
                  "New Version must follow the X.Y.Z semantic version format",
              });
            }

            if (!gte(value, serverVersion)) {
              return this.createError({
                message:
                  "New Version must be greater than or equal to the current registry version",
              });
            }

            return true;
          })
          .required("New Version is a required field"),
        message: Yup.string().required("Message is a required field"),
      }),
    [serverVersion],
  );
}

const SaveModVersionModalBody: React.VFC<{ onHide: () => void }> = ({
  onHide,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const isMounted = useIsMounted();

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
  const { packageId, sourceModDefinition } = modalData;
  const modId = sourceModDefinition.metadata.id;

  const formSchema = useFormSchema(sourceModDefinition);
  const initialFormState = useInitialFormState(sourceModDefinition);

  const onSubmit: OnSubmit<SaveVersionFormValues> = async (values, helpers) => {
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

      const upsertResponse = await updateModDefinitionOnServer({
        packageId,
        modDefinition: unsavedModDefinition,
        message: values.message,
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

      notify.success({
        message: "Saved mod",
      });
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
        name="serverVersion"
        label="Current Version"
        id="save-mod-modal-server-version"
        description="The current registry version"
        value={sourceModDefinition.metadata.version}
        disabled
      />
      <ConnectedFieldTemplate
        name="version"
        label="New Version"
        id="save-mod-modal-version"
        description="The new version. Must follow the MAJOR.MINOR.PATCH semantic version format"
        showUntouchedErrors
      />
      <ConnectedFieldTemplate
        name="message"
        label="Message"
        id="save-mod-modal-message"
        as="textarea"
        rows={3}
        placeholder="Fixed bug... Added feature..."
        description="A short description of the changes to the mod"
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
