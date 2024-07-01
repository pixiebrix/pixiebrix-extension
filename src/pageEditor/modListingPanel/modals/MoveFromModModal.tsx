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
import { useDispatch, useSelector } from "react-redux";
import { actions } from "@/pageEditor/slices/editorSlice";
import {
  selectActiveModComponentFormState,
  selectEditorModalVisibilities,
} from "@/pageEditor/slices/editorSelectors";
import notify from "@/utils/notify";
import { Alert, Button, Modal } from "react-bootstrap";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExclamationTriangle,
  faHistory,
} from "@fortawesome/free-solid-svg-icons";
import { object, string } from "yup";
import Form, {
  type OnSubmit,
  type RenderBody,
  type RenderSubmit,
} from "@/components/form/Form";
import { type RadioItem } from "@/components/form/widgets/radioItemList/radioItemListWidgetTypes";
import RadioItemListWidget from "@/components/form/widgets/radioItemList/RadioItemListWidget";
import { assertNotNullish } from "@/utils/nullishUtils";

type FormState = {
  moveOrRemove: "move" | "remove";
};

const initialFormState: FormState = {
  moveOrRemove: "move",
};

const formStateSchema = object({
  moveOrRemove: string().oneOf(["move", "remove"]).required(),
});

const MoveFromModModal: React.FC = () => {
  const { isRemoveFromModModalVisible: show } = useSelector(
    selectEditorModalVisibilities,
  );
  const modComponentFormState = useSelector(selectActiveModComponentFormState);

  const dispatch = useDispatch();
  const hideModal = useCallback(() => {
    dispatch(actions.hideModal());
  }, [dispatch]);

  const onSubmit = useCallback<OnSubmit<FormState>>(
    async ({ moveOrRemove }, helpers) => {
      const keepLocalCopy = moveOrRemove === "move";

      try {
        const modComponentId = modComponentFormState?.uuid;
        assertNotNullish(
          modComponentId,
          "mod component id not found for active mod component",
        );
        dispatch(
          actions.removeModComponentFormStateFromMod({
            modComponentId,
            keepLocalCopy,
          }),
        );
        hideModal();
      } catch (error) {
        notify.error({
          message: "Problem removing from mod",
          error,
        });
      } finally {
        helpers.setSubmitting(false);
      }
    },
    [modComponentFormState?.uuid, dispatch, hideModal],
  );

  const radioItems: RadioItem[] = [
    {
      label: "Move the starter brick to stand-alone",
      value: "move",
    },
    {
      label: "Delete starter brick",
      value: "remove",
    },
  ];

  const renderBody: RenderBody = ({ values }) => (
    <Modal.Body>
      <ConnectedFieldTemplate
        name="moveOrRemove"
        as={RadioItemListWidget}
        items={radioItems}
        header="Move or delete the starter brick from the mod?"
      />
      {values.moveOrRemove === "remove" && (
        <Alert variant="warning">
          <FontAwesomeIcon icon={faExclamationTriangle} />
          &nbsp;The{" "}
          <strong>
            <FontAwesomeIcon icon={faHistory} fixedWidth /> Reset{" "}
          </strong>
          action located on the mod&apos;s three-dot menu can be used to restore
          the starter brick <strong>before saving the mod</strong>.
        </Alert>
      )}
    </Modal.Body>
  );

  const renderSubmit: RenderSubmit = ({ isSubmitting, isValid, values }) => (
    <Modal.Footer>
      <Button variant="info" onClick={hideModal}>
        Cancel
      </Button>
      <Button
        variant="danger"
        type="submit"
        disabled={!isValid || isSubmitting}
      >
        {values.moveOrRemove === "move" ? "Move" : "Remove"}
      </Button>
    </Modal.Footer>
  );

  return (
    <Modal show={show} onHide={hideModal}>
      <Modal.Header closeButton>
        <Modal.Title>
          Remove <em>{modComponentFormState?.label}</em> from mod{" "}
          <em>{modComponentFormState?.modMetadata?.name}</em>?
        </Modal.Title>
      </Modal.Header>
      <Form
        initialValues={initialFormState}
        validationSchema={formStateSchema}
        onSubmit={onSubmit}
        renderBody={renderBody}
        renderSubmit={renderSubmit}
      />
    </Modal>
  );
};

export default MoveFromModModal;
