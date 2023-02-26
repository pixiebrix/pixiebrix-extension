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

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { actions } from "@/pageEditor/slices/editorSlice";
import { Button, Modal } from "react-bootstrap";
import {
  selectActiveRecipeId,
  selectEditorModalVisibilities,
} from "@/pageEditor/slices/editorSelectors";
import { useRecipe } from "@/recipes/recipesHooks";

const SaveAsNewRecipeModal: React.FC = () => {
  const { isSaveAsNewRecipeModalVisible: show } = useSelector(
    selectEditorModalVisibilities
  );

  const recipeId = useSelector(selectActiveRecipeId);
  const { data: recipe, isFetching } = useRecipe(recipeId);
  const recipeName = recipe?.metadata?.name ?? "this mod";

  const dispatch = useDispatch();

  const hideModal = () => {
    dispatch(actions.hideModal());
  };

  const onConfirm = () => {
    // Don't keep the old recipe active
    dispatch(actions.showCreateRecipeModal({ keepLocalCopy: false }));
  };

  return (
    <Modal show={show} onHide={hideModal}>
      <Modal.Header closeButton>
        <Modal.Title>Save as new mod?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        You do not have permissions to edit <em>{recipeName}</em>. Save as a new
        mod?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="info" onClick={hideModal}>
          Cancel
        </Button>
        <Button variant="primary" disabled={isFetching} onClick={onConfirm}>
          Save as New
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SaveAsNewRecipeModal;
