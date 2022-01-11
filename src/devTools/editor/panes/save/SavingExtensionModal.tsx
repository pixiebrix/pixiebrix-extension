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

import { RecipeDefinition } from "@/types/definitions";
import React from "react";
import { Button, Modal } from "react-bootstrap";
import { FormState } from "@/devTools/editor/slices/editorSlice";

type OwnProps = {
  recipe: RecipeDefinition;
  element: FormState;
  isRecipeEditable: boolean;
  close: () => void;
  saveAsPersonalExtension: () => void;
  showCreateRecipeModal: () => void;
  showUpdateRecipeModal: () => void;
};

const SavingExtensionModal: React.FC<OwnProps> = ({
  recipe,
  element,
  isRecipeEditable,
  close,
  saveAsPersonalExtension,
  showCreateRecipeModal,
  showUpdateRecipeModal,
}) => {
  let message: string;
  let showNewRecipeButton = false;
  let showUpdateRecipeButton = false;

  const recipeName = recipe.metadata.name;
  const installedRecipeVersion = element.recipe.version;
  const latestRecipeVersion = recipe.metadata.version;

  const canUpdateRecipeApiVersion = recipe.extensionPoints.length <= 1;
  if (recipe.apiVersion !== element.apiVersion && !canUpdateRecipeApiVersion) {
    message = `This extension is part of blueprint ${recipeName}. The API version ${recipe.apiVersion} of the blueprint is not compatible with the current API version ${element.apiVersion} of the extension.`;
  } else if (isRecipeEditable) {
    if (installedRecipeVersion === latestRecipeVersion) {
      message = `This extension is part of blueprint ${recipeName}.`;
      showNewRecipeButton = true;
      showUpdateRecipeButton = true;
    } else {
      message = `This extension is part of blueprint ${recipeName} version ${installedRecipeVersion}, but the latest version is ${latestRecipeVersion}.`;
    }
  } else {
    message = `This extension is part of blueprint ${recipeName}. You do not have permission to edit this blueprint.`;
    showNewRecipeButton = true;
  }

  return (
    <Modal show onHide={close} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Saving extension</Modal.Title>
      </Modal.Header>

      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button
          variant="info"
          className="mr-2"
          onClick={() => {
            close();
          }}
        >
          Cancel
        </Button>

        <Button
          variant={showNewRecipeButton ? "secondary" : "primary"}
          onClick={saveAsPersonalExtension}
        >
          Save as Personal Extension
        </Button>

        {showNewRecipeButton && (
          <Button
            variant={showUpdateRecipeButton ? "secondary" : "primary"}
            onClick={showCreateRecipeModal}
          >
            Save as New Blueprint
          </Button>
        )}

        {showUpdateRecipeButton && (
          <Button variant="primary" onClick={showUpdateRecipeModal}>
            Update Blueprint
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default SavingExtensionModal;
