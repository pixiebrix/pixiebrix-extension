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

import React, { useMemo } from "react";
import { Button, Modal } from "react-bootstrap";
import SelectWidget from "@/components/form/widgets/SelectWidget";
import SwitchButtonWidget from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import { useDispatch, useSelector } from "react-redux";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import extensionsSlice from "@/store/extensionsSlice";
import {
  selectActiveElement,
  selectInstalledRecipeMetadatas,
} from "@/pageEditor/slices/editorSelectors";
import { RecipeMetadata, RegistryId } from "@/core";
import { Form, Formik } from "formik";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import notify from "@/utils/notify";

const { actions: optionsActions } = extensionsSlice;

type FormState = {
  recipeId: RegistryId;
  keepLocalCopy: boolean;
};

const initialFormState: FormState = {
  recipeId: null,
  keepLocalCopy: false,
};

const AddToRecipeModal: React.VFC = () => {
  const recipeMetadatas = useSelector(selectInstalledRecipeMetadatas);
  const activeElement = useSelector(selectActiveElement);

  const recipeMetadataById = useMemo(() => {
    const result: Record<RegistryId, RecipeMetadata> = {};
    for (const metadata of recipeMetadatas) {
      result[metadata.id] = metadata;
    }

    return result;
  }, [recipeMetadatas]);

  const dispatch = useDispatch();

  const hideModal = () => {
    dispatch(editorActions.hideAddToRecipeModal());
  };

  function onConfirmAddToRecipe(recipeId: RegistryId, keepLocalCopy: boolean) {
    if (recipeId === "@new") {
      dispatch(editorActions.transitionToCreateRecipeModal(keepLocalCopy));
      return;
    }

    // eslint-disable-next-line security/detect-object-injection -- recipe id is from select options
    const recipeMetadata = recipeMetadataById[recipeId];

    try {
      const elementId = activeElement.uuid;
      dispatch(
        editorActions.addElementToRecipe({
          elementId,
          recipeMetadata,
          keepLocalCopy,
        })
      );
      if (!keepLocalCopy) {
        dispatch(optionsActions.removeExtension({ extensionId: elementId }));
      }
    } catch (error: unknown) {
      notify.error({
        message: "Problem adding extension to blueprint",
        error,
      });
    } finally {
      hideModal();
    }
  }

  const selectOptions = [
    { label: "➕ Create new blueprint...", value: "@new" },
    ...recipeMetadatas.map((metadata) => ({
      label: metadata.name,
      value: metadata.id,
    })),
  ];

  return (
    <Modal show onHide={hideModal}>
      <Modal.Header closeButton>
        <Modal.Title>
          Add <em>{activeElement?.label}</em> to a blueprint
        </Modal.Title>
      </Modal.Header>
      <Formik
        initialValues={initialFormState}
        onSubmit={({ recipeId, keepLocalCopy }) => {
          onConfirmAddToRecipe(recipeId, keepLocalCopy);
        }}
      >
        {({ handleSubmit }) => (
          <Form onSubmit={handleSubmit}>
            <Modal.Body>
              <ConnectedFieldTemplate
                name="recipeId"
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
