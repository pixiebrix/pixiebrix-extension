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
import { useDispatch, useSelector } from "react-redux";
import { actions } from "@/pageEditor/slices/editorSlice";
import {
  selectActiveElement,
  selectEditorModalVisibilities,
} from "@/pageEditor/slices/editorSelectors";
import notify from "@/utils/notify";
import { Alert, Button, Modal } from "react-bootstrap";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { object, string } from "yup";
import Form, {
  type OnSubmit,
  type RenderBody,
  type RenderSubmit,
} from "@/components/form/Form";
import { type RadioItem } from "@/components/form/widgets/radioItemList/radioItemListWidgetTypes";
import RadioItemListWidget from "@/components/form/widgets/radioItemList/RadioItemListWidget";

type FormState = {
  moveOrRemove: "move" | "remove";
};

const initialFormState: FormState = {
  moveOrRemove: "move",
};

const formStateSchema = object({
  moveOrRemove: string().oneOf(["move", "remove"]).required(),
});

const RemoveFromRecipeModal: React.FC = () => {
  const { isRemoveFromRecipeModalVisible: show } = useSelector(
    selectEditorModalVisibilities
  );
  const activeElement = useSelector(selectActiveElement);

  const dispatch = useDispatch();
  const hideModal = useCallback(() => {
    dispatch(actions.hideModal());
  }, [dispatch]);

  const onSubmit = useCallback<OnSubmit<FormState>>(
    async ({ moveOrRemove }, helpers) => {
      const keepLocalCopy = moveOrRemove === "move";

      try {
        const elementId = activeElement.uuid;
        dispatch(actions.removeElementFromRecipe({ elementId, keepLocalCopy }));
        hideModal();
      } catch (error: unknown) {
        notify.error({
          message: "Problem removing from mod",
          error,
        });
      } finally {
        helpers.setSubmitting(false);
      }
    },
    [activeElement?.uuid, dispatch, hideModal]
  );

  const radioItems: RadioItem[] = [
    {
      label: "Move the starter brick to stand-alone",
      value: "move",
    },
    {
      label: "Remove from the mod",
      value: "remove",
    },
  ];

  const renderBody: RenderBody = ({ values }) => (
    <Modal.Body>
      <ConnectedFieldTemplate
        name="moveOrRemove"
        as={RadioItemListWidget}
        items={radioItems}
        header="Move or remove the starter brick?"
      />
      {values.moveOrRemove === "remove" && (
        <Alert variant="warning">
          <FontAwesomeIcon icon={faExclamationTriangle} />
          &nbsp;This will delete the starter brick. To restore it, use the reset
          button.
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
          Remove <em>{activeElement?.label}</em> from mod{" "}
          <em>{activeElement?.recipe?.name}</em>?
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

export default RemoveFromRecipeModal;
