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
import { FormState } from "@/devTools/editor/slices/editorSlice";
import { Button, ButtonGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faHistory, faSave, faTrash } from "@fortawesome/free-solid-svg-icons";
import useRemove from "@/devTools/editor/hooks/useRemove";
import useReset from "@/devTools/editor/hooks/useReset";

const ActionToolbar: React.FunctionComponent<{
  element: FormState;
  disabled: boolean;
  onSave: () => void;
}> = ({ element, disabled, onSave }) => {
  const remove = useRemove(element);
  const reset = useReset();

  return (
    <ButtonGroup className="ml-2">
      <Button disabled={disabled} size="sm" variant="primary" onClick={onSave}>
        <FontAwesomeIcon icon={faSave} /> Save
      </Button>
      {element.installed && (
        <Button
          disabled={disabled}
          size="sm"
          variant="warning"
          onClick={() => {
            reset({ element });
          }}
        >
          <FontAwesomeIcon icon={faHistory} /> Reset
        </Button>
      )}
      {/* Remove is always available and enabled */}
      <Button variant="danger" size="sm" onClick={remove}>
        <FontAwesomeIcon icon={faTrash} /> Remove
      </Button>
    </ButtonGroup>
  );
};

export default ActionToolbar;
