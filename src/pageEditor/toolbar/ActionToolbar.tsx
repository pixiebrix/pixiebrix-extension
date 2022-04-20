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
import { Button, ButtonGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHistory, faSave, faTrash } from "@fortawesome/free-solid-svg-icons";
import useResetExtension from "@/pageEditor/hooks/useResetExtension";
import { FormState } from "@/pageEditor/pageEditorTypes";
import useResetRecipe from "@/pageEditor/hooks/useResetRecipe";
import useRemoveExtension from "@/pageEditor/hooks/useRemoveExtension";
import useRemoveRecipe from "@/pageEditor/hooks/useRemoveRecipe";

const ActionToolbar: React.FunctionComponent<{
  element: FormState;
  disabled: boolean;
  onSave: () => void;
}> = ({ element, disabled, onSave }) => {
  const removeExtension = useRemoveExtension();
  const removeRecipe = useRemoveRecipe();
  const resetExtension = useResetExtension();
  const resetRecipe = useResetRecipe();

  const removeElement = async () => {
    if (element.recipe) {
      await removeRecipe(element.recipe.id);
    } else {
      await removeExtension({ extensionId: element.uuid });
    }
  };

  const resetElement = async () => {
    if (element.recipe) {
      await resetRecipe(element.recipe.id);
    } else {
      await resetExtension({ element });
    }
  };

  return (
    <ButtonGroup className="ml-2">
      <Button disabled={disabled} size="sm" variant="primary" onClick={onSave}>
        <FontAwesomeIcon icon={faSave} /> Save
      </Button>
      {(element.installed || element.recipe != null) && (
        <Button
          disabled={disabled}
          size="sm"
          variant="warning"
          onClick={resetElement}
        >
          <FontAwesomeIcon icon={faHistory} /> Reset
        </Button>
      )}
      {/* Remove is always available and enabled */}
      <Button variant="danger" size="sm" onClick={removeElement}>
        <FontAwesomeIcon icon={faTrash} /> Remove
      </Button>
    </ButtonGroup>
  );
};

export default ActionToolbar;
