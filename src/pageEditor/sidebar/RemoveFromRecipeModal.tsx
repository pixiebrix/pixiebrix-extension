/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { selectActiveElement } from "@/pageEditor/slices/editorSelectors";
import extensionsSlice from "@/store/extensionsSlice";
import notify from "@/utils/notify";
import { Alert, Button, Modal } from "react-bootstrap";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationTriangle } from "@fortawesome/free-solid-svg-icons";
import { boolean, object } from "yup";
import Form, {
  OnSubmit,
  RenderBody,
  RenderSubmit,
} from "@/components/form/Form";

const { actions: optionsActions } = extensionsSlice;

type FormState = {
  keepLocalCopy: boolean;
};

const initialFormState: FormState = {
  keepLocalCopy: true,
};

const formStateSchema = object({
  keepLocalCopy: boolean().required(),
});

const RemoveFromRecipeModal: React.VFC = () => {
  const activeElement = useSelector(selectActiveElement);

  const dispatch = useDispatch();
  const hideModal = () => {
    dispatch(editorActions.hideRemoveFromRecipeModal());
  };

  const onSubmit = useCallback<OnSubmit<FormState>>(
    async ({ keepLocalCopy }, helpers) => {
      try {
        const elementId = activeElement.uuid;
        dispatch(
          editorActions.removeElementFromRecipe({ elementId, keepLocalCopy })
        );
        dispatch(optionsActions.removeExtension({ extensionId: elementId }));
        hideModal();
      } catch (error: unknown) {
        notify.error({
          message: "Problem removing extension from blueprint",
          error,
        });
      } finally {
        helpers.setSubmitting(false);
      }
    },
    [activeElement?.uuid, dispatch, hideModal]
  );

  const renderBody: RenderBody = ({ values }) => (
    <>
      <ConnectedFieldTemplate
        name="keepLocalCopy"
        label="Keep a local copy of the extension?"
        fitLabelWidth
        as={SwitchButtonWidget}
      />
      {!values.keepLocalCopy && (
        <Alert variant="warning">
          <FontAwesomeIcon icon={faExclamationTriangle} />
          &nbsp;This will delete the extension. To restore it, use the reset
          button.
        </Alert>
      )}
    </>
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
        {values.keepLocalCopy ? "Remove" : "Delete"}
      </Button>
    </Modal.Footer>
  );

  return (
    <Modal show onHide={hideModal}>
      <Modal.Header closeButton>
        <Modal.Title>
          Remove <em>{activeElement?.label}</em> from blueprint{" "}
          <em>{activeElement?.recipe?.name}</em>?
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form
          initialValues={initialFormState}
          validationSchema={formStateSchema}
          onSubmit={onSubmit}
          renderBody={renderBody}
          renderSubmit={renderSubmit}
        />
      </Modal.Body>
    </Modal>
  );
};

export default RemoveFromRecipeModal;
