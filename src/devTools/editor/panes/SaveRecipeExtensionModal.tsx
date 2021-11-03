/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useRef, useState } from "react";
import { Button, Modal } from "react-bootstrap";
import { useGetRecipesQuery } from "@/services/api";
import { GridLoader } from "react-spinners";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { useCreate } from "@/devTools/editor/hooks/useCreate";
import Form from "@/components/form/Form";
import * as yup from "yup";
import { RegistryId, Metadata } from "@/core";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";

type SaveBlueprintExtensionModalProps = {
  element: FormState;
  onDone: () => void;
  setStatus: (status: string) => void;
  onClose: () => void;
};

const updateRecipeSchema: yup.ObjectSchema<Metadata> = yup.object().shape({
  id: yup.string<RegistryId>().required(),
  name: yup.string().required(),
  version: yup.string().required(),
  description: yup.string(),
});

const SaveRecipeExtensionModal: React.FC<SaveBlueprintExtensionModalProps> = ({
  element,
  onDone,
  setStatus,
  onClose,
}) => {
  const create = useCreate();
  const { data: recipes, isLoading: areRecipesLoading } = useGetRecipesQuery();
  const [isRecipeOptionsModalShown, setRecipeOptionsModalShown] = useState(
    false
  );
  const isNewRecipe = useRef(false);
  const newRecipeInitialValues = useRef<Metadata>(null);

  const close = () => {
    onDone();
    onClose();
  };

  if (areRecipesLoading) {
    return (
      <Modal show onHide={close} backdrop="static" keyboard={false}>
        <Modal.Header closeButton>
          <Modal.Title>Loading data...</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <GridLoader />
        </Modal.Body>
      </Modal>
    );
  }

  const elementRecipeMeta = element.recipe;
  const recipe = recipes.find((r) => r.metadata.id === elementRecipeMeta.id);

  const saveAsPersonalExtension = () => {
    // Making personal extension from the existing one
    const { extensionPoint, recipe, uuid, ...rest } = element;
    // ToDo see how new extensions are created
    const personalElement: FormState = {
      uuid: uuidv4(),
      ...rest,
      extensionPoint: {
        ...extensionPoint,
        metadata: {
          ...extensionPoint.metadata,
          // ToDo generate proper id
          id: validateRegistryId("personal/new_ext" + uuidv4()),
        },
      },
    };

    onClose();

    void create(personalElement, onDone, setStatus);

    // ToDo
    // 1. reset the form
    // 2. select new extension
  };

  const createNewRecipe = () => {
    isNewRecipe.current = true;
    newRecipeInitialValues.current = {
      // ToDo generate recipe id
      id: "" as RegistryId,
      name: `Copy of ${elementRecipeMeta.name}`,
      version: elementRecipeMeta.version,
      description: elementRecipeMeta.description,
    };

    setRecipeOptionsModalShown(true);
  };

  const updateRecipe = () => {
    isNewRecipe.current = false;
    newRecipeInitialValues.current = elementRecipeMeta;

    setRecipeOptionsModalShown(true);
  };

  const saveRecipeAndExtension = () => {};

  const recipeName = elementRecipeMeta.name;
  const isRecipeEditable = true;
  const installedRecipeVersion = elementRecipeMeta.version;
  const latestRecipeVersion = recipe.metadata.version;

  let message: string;
  let showNewRecipeButton = false;
  let showUpdateRecipeButton = false;

  if (isRecipeEditable) {
    if (installedRecipeVersion === latestRecipeVersion) {
      message = `This extension is part of blueprint ${recipeName}, do you want to edit the blueprint, or create a personal extension?`;
      showNewRecipeButton = true;
      showUpdateRecipeButton = true;
    } else {
      message = `This extension is part of blueprint ${recipeName} version ${installedRecipeVersion}, but the latest version is ${latestRecipeVersion}.`;
    }
  } else {
    message = `This extension is part of blueprint ${recipeName}. You do not have permission to edit this blueprint.`;
    showNewRecipeButton = true;
  }

  return isRecipeOptionsModalShown ? (
    <Modal show onHide={close} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Blueprint properties</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form
          validationSchema={updateRecipeSchema}
          initialValues={newRecipeInitialValues.current}
          onSubmit={saveRecipeAndExtension}
          renderSubmit={({ isSubmitting, isValid }) => (
            <div className="text-right">
              <Button variant="info" className="mr-2" onClick={close}>
                Cancel
              </Button>

              <Button type="submit" disabled={!isValid || isSubmitting}>
                {isNewRecipe.current ? "Create new" : "Update"} Blueprint
              </Button>
            </div>
          )}
        >
          <ConnectedFieldTemplate
            name="id"
            label="ID"
            disabled={!isNewRecipe.current}
          />
          <ConnectedFieldTemplate name="name" label="Name" />
          <ConnectedFieldTemplate name="version" label="Version" />
          <ConnectedFieldTemplate name="description" label="Description" />
        </Form>
      </Modal.Body>
    </Modal>
  ) : (
    <Modal show onHide={close} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Saving extension</Modal.Title>
      </Modal.Header>

      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="info" className="mr-2" onClick={close}>
          Cancel
        </Button>

        <Button onClick={saveAsPersonalExtension}>
          Save as Personal Extension
        </Button>

        {showNewRecipeButton && (
          <Button onClick={createNewRecipe}>Save as New Blueprint</Button>
        )}

        {showUpdateRecipeButton && (
          <Button onClick={updateRecipe}>Update Blueprint</Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default SaveRecipeExtensionModal;
