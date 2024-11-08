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
import { Button, Modal } from "react-bootstrap";
import SelectWidget from "../../../components/form/widgets/SelectWidget";
import { useDispatch, useSelector } from "react-redux";
import { actions as editorActions } from "../../store/editor/editorSlice";
import {
  selectActiveModComponentFormState,
  selectEditorModalVisibilities,
  getModalDataSelector,
  selectModMetadataMap,
} from "../../store/editor/editorSelectors";
import ConnectedFieldTemplate from "../../../components/form/ConnectedFieldTemplate";
import Form, {
  type OnSubmit,
  type RenderBody,
  type RenderSubmit,
} from "../../../components/form/Form";
import { object, string } from "yup";
import { type RegistryId } from "../../../types/registryTypes";
import { assertNotNullish } from "../../../utils/nullishUtils";
import { ModalKey } from "../../store/editor/pageEditorTypes";
import { type AppDispatch } from "../../store/store";

type FormState = {
  modId: RegistryId | null;
};

const initialFormState: FormState = {
  modId: null,
};

const NEW_MOD_ID = "@new" as RegistryId;

const formStateSchema = object({
  modId: string().required(),
});

/**
 * Modal to move or copy a mod component to an existing or new mod.
 * @see selectKeepLocalCopyOnCreateMod
 */
const MoveOrCopyToModModal: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { isMoveCopyToModVisible: show } = useSelector(
    selectEditorModalVisibilities,
  );
  const modMetadataMap = useSelector(selectModMetadataMap);
  const modalData = useSelector(
    getModalDataSelector(ModalKey.MOVE_COPY_TO_MOD),
  );
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );

  const hideModal = useCallback(() => {
    dispatch(editorActions.hideModal());
  }, [dispatch]);

  const onSubmit: OnSubmit<FormState> = async ({ modId }) => {
    assertNotNullish(modId, "Invalid form state: modId is null");
    assertNotNullish(activeModComponentFormState, "No active mod component");
    assertNotNullish(modalData, "Expected modal data to be defined");

    const { keepLocalCopy: isCopyAction } = modalData;

    if (modId === NEW_MOD_ID) {
      dispatch(
        editorActions.showCreateModModal({
          keepLocalCopy: isCopyAction,
          sourceModComponentId: activeModComponentFormState.uuid,
        }),
      );
      return;
    }

    const modMetadata = modMetadataMap.get(modId);
    assertNotNullish(
      modMetadata,
      "Invalid for state: mod id does not match activate mod metadata entry",
    );

    await dispatch(
      editorActions.duplicateActiveModComponent({
        destinationModMetadata: modMetadata,
      }),
    );

    if (!isCopyAction) {
      // Remove the original mod component to complete the move action
      dispatch(
        editorActions.markModComponentFormStateAsDeleted(
          activeModComponentFormState.uuid,
        ),
      );
    }

    hideModal();
  };

  const selectOptions = useMemo(
    () => [
      { label: "➕ Create new mod...", value: NEW_MOD_ID },
      ...[...modMetadataMap.values()].map((metadata) => ({
        label: metadata.name,
        value: metadata.id,
      })),
    ],
    [modMetadataMap],
  );

  const renderBody: RenderBody = useCallback(
    () => (
      <Modal.Body>
        <ConnectedFieldTemplate
          name="modId"
          hideLabel
          description="Choose a destination mod"
          as={SelectWidget}
          options={selectOptions}
        />
      </Modal.Body>
    ),
    [selectOptions],
  );

  const renderSubmit: RenderSubmit = useCallback(
    ({ isSubmitting, isValid }) => (
      <Modal.Footer>
        <Button variant="info" onClick={hideModal}>
          Cancel
        </Button>
        <Button
          variant="primary"
          type="submit"
          disabled={!isValid || isSubmitting}
        >
          {modalData?.keepLocalCopy ? "Copy" : "Move"}
        </Button>
      </Modal.Footer>
    ),
    [modalData?.keepLocalCopy, hideModal],
  );

  return (
    <Modal show={show} onHide={hideModal}>
      <Modal.Header closeButton>
        <Modal.Title>
          {modalData?.keepLocalCopy ? "Copy" : "Move"}{" "}
          <em>{activeModComponentFormState?.label}</em>
        </Modal.Title>
      </Modal.Header>
      <Form
        validationSchema={formStateSchema}
        validateOnMount
        initialValues={initialFormState}
        onSubmit={onSubmit}
        renderBody={renderBody}
        renderSubmit={renderSubmit}
      />
    </Modal>
  );
};

export default MoveOrCopyToModModal;
