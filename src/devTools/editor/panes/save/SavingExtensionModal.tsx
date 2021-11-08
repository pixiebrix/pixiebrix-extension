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

import React from "react";
import { Button, Modal } from "react-bootstrap";
import useSavingWizard from "./useSavingWizard";

type OwnProps = {
  recipeName: string;
  installedRecipeVersion: string;
  latestRecipeVersion: string;
  isRecipeEditable: boolean;
  saveAsPersonalExtension: () => void;
  showCreateRecipeModal: () => void;
  showUpdateRecipeModal: () => void;
};

const SavingExtensionModal: React.FC<OwnProps> = ({
  recipeName,
  installedRecipeVersion,
  latestRecipeVersion,
  isRecipeEditable,
  saveAsPersonalExtension,
  showCreateRecipeModal,
  showUpdateRecipeModal,
}) => {
  const { closeWizard } = useSavingWizard();

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

  return (
    <Modal show onHide={closeWizard} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Saving extension</Modal.Title>
      </Modal.Header>

      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button
          variant="info"
          className="mr-2"
          onClick={() => {
            closeWizard();
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
