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

import React, { useState } from "react";
import { Button, Modal } from "react-bootstrap";
import FieldTemplate from "@/components/form/FieldTemplate";
import SelectWidget, {
  Option,
  SelectWidgetOnChange,
} from "@/components/form/widgets/SelectWidget";
import SwitchButtonWidget, {
  CheckBoxLike,
} from "@/components/form/widgets/switchButton/SwitchButtonWidget";
import { useDispatch, useSelector } from "react-redux";
import { actions } from "@/pageEditor/slices/editorSlice";
import {
  selectActiveElement,
  selectInstalledRecipeMetadatas,
  selectIsShowingAddToRecipeModal,
} from "@/pageEditor/slices/editorSelectors";
import { RecipeMetadata } from "@/core";

const AddToRecipeModal: React.VFC = () => {
  const recipeMetadatas = useSelector(selectInstalledRecipeMetadatas);
  const activeElement = useSelector(selectActiveElement);

  const [recipeMetadata, setRecipeMetadata] = useState<RecipeMetadata>(null);
  const [keepLocalCopy, setKeepLocalCopy] = useState(false);

  const isModalShown = useSelector(selectIsShowingAddToRecipeModal);
  const dispatch = useDispatch();
  const hideModal = () => {
    // Reset to defaults
    setRecipeMetadata(null);
    setKeepLocalCopy(false);
    // Hide the modal
    dispatch(actions.hideAddToRecipeModal());
  };

  const selectOptions = recipeMetadatas.map((metadata) => ({
    label: metadata.name,
    value: metadata,
  }));

  const onChangeRecipe: SelectWidgetOnChange<Option<RecipeMetadata>> = (
    event
  ) => {
    const metadata = event.target.value;
    if (metadata) {
      setRecipeMetadata(metadata);
    }
  };

  const onChangeKeepLocal: React.ChangeEventHandler<CheckBoxLike> = (event) => {
    setKeepLocalCopy(event.target.value);
  };

  const onConfirmAddToRecipe = () => {
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
    <Modal show={isModalShown}>
      <Modal.Header closeButton>
        <Modal.Title>
          Add <strong>{activeElement?.label}</strong> to a blueprint
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <FieldTemplate
          name="recipe"
          hideLabel
          description="Choose a blueprint"
          as={SelectWidget}
          options={selectOptions}
          value={recipeMetadata}
          onChange={onChangeRecipe}
        />
        <FieldTemplate
          name="keepLocal"
          label="Keep a local copy of the extension?"
          fitLabelWidth
          as={SwitchButtonWidget}
          value={keepLocalCopy}
          onChange={onChangeKeepLocal}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="info" onClick={hideModal}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirmAddToRecipe}>
          Add
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AddToRecipeModal;
