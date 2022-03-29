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

import React from "react";
import { Button, Modal } from "react-bootstrap";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import { useDispatch, useSelector } from "react-redux";
import { actions } from "@/pageEditor/slices/editorSlice";
import {
  selectActiveElement,
  selectInstalledRecipeMetadatas,
} from "@/pageEditor/slices/editorSelectors";
import { RecipeMetadata } from "@/core";
import { Form, Formik } from "formik";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";

type FormState = {
  recipeMetadata: RecipeMetadata;
  keepLocalCopy: boolean;
};

const AddToRecipeModal: React.VFC = () => {
  const recipeMetadatas = useSelector(selectInstalledRecipeMetadatas);
  const activeElement = useSelector(selectActiveElement);

  const initialFormState: FormState = {
    recipeMetadata: null,
    keepLocalCopy: false,
  };

  const dispatch = useDispatch();
  const hideModal = () => {
    dispatch(actions.hideAddToRecipeModal());
  };

  const selectOptions = recipeMetadatas.map((metadata) => ({
    label: metadata.name,
    value: metadata,
  }));

  const onConfirmAddToRecipe = (
    recipeMetadata: RecipeMetadata,
    keepLocalCopy: boolean
  ) => {
    dispatch(
      actions.addElementToRecipe({
        elementId: activeElement.uuid,
        recipeMetadata,
        keepLocalCopy,
      })
    );
    hideModal();
  };

  return (
    <Modal show onHide={hideModal}>
      <Modal.Header closeButton>
        <Modal.Title>
          Add <em>{activeElement?.label}</em> to a blueprint
        </Modal.Title>
      </Modal.Header>
      <Formik
        initialValues={initialFormState}
        onSubmit={({ recipeMetadata, keepLocalCopy }) => {
          onConfirmAddToRecipe(recipeMetadata, keepLocalCopy);
        }}
      >
        {({ handleSubmit }) => (
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <ConnectedFieldTemplate
                name="recipeMetadata"
                hideLabel
                description="Choose a blueprint"
                as={SelectWidget}
                options={selectOptions}
              />
              <ConnectedFieldTemplate
                name="keepLocalCopy"
                label="Keep a local copy of the extension?"
                fitLabelWidth
                as={SwitchButtonWidget}
              />
            </Modal.Body>
            <Modal.Footer>
              <Button variant="info" onClick={hideModal}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Add
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Formik>
    </Modal>
  );
};

export default AddToRecipeModal;
