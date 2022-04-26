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
import { useDispatch, useSelector } from "react-redux";
import { actions } from "@/pageEditor/slices/editorSlice";
import { Button, Modal } from "react-bootstrap";
import { selectActiveRecipeId } from "@/pageEditor/slices/editorSelectors";
import { useGetRecipesQuery } from "@/services/api";
import LoadingDataModal from "@/pageEditor/panes/save/LoadingDataModal";

const SaveAsNewRecipeModal: React.VFC = () => {
  const activeRecipeId = useSelector(selectActiveRecipeId);
  const { data: recipes, isLoading } = useGetRecipesQuery();
  const recipeName =
    recipes?.find((recipe) => recipe.metadata.id === activeRecipeId)?.metadata
      ?.name ?? "this blueprint";

  const dispatch = useDispatch();

  const hideModal = () => {
    dispatch(actions.hideSaveAsNewRecipeModal());
  };

  const onConfirm = () => {
    dispatch(actions.transitionSaveAsNewToCreateRecipeModal());
  };

  if (isLoading) {
    return <LoadingDataModal onClose={hideModal} />;
  }

  return (
    <Modal show onHide={hideModal}>
      <Modal.Header closeButton>
        <Modal.Title>Save as new blueprint?</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        You do not have permissions to edit <em>{recipeName}</em>. Save as a new
        blueprint?
      </Modal.Body>
      <Modal.Footer>
        <Button variant="info" onClick={hideModal}>
          Cancel
        </Button>
        <Button variant="primary" disabled={isLoading} onClick={onConfirm}>
          Save as New
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SaveAsNewRecipeModal;
