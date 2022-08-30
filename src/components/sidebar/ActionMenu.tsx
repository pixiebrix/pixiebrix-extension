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
import SaveButton from "@/pageEditor/sidebar/actionButtons/SaveButton";
import { Dropdown } from "react-bootstrap";
import {
  faEllipsisH,
  faFileExport,
  faFileImport,
  faHistory,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styles from "./ActionMenu.module.scss";

export type ActionMenuProps = {
  onRemove: () => Promise<void>;
  onSave?: () => Promise<void>;
  onReset?: () => Promise<void>;
  isDirty?: boolean;
  onAddToRecipe?: () => Promise<void>;
  onRemoveFromRecipe?: () => Promise<void>;
  disabled?: boolean;
};

const ActionMenu: React.FC<ActionMenuProps> = ({
  onRemove,
  onSave,
  onReset,
  isDirty,
  onAddToRecipe,
  onRemoveFromRecipe,
  disabled,
}) => {
  const isResetDisabled = !isDirty || disabled;
  const isSaveDisabled = !isDirty || disabled;

  return (
    // We aren't actually making this do anything on click, so we can suppress these a11y warnings.
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions
    <div
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      {onSave && <SaveButton onClick={onSave} disabled={isSaveDisabled} />}
      <Dropdown>
        <Dropdown.Toggle className={styles.toggle}>
          <FontAwesomeIcon icon={faEllipsisH} />
        </Dropdown.Toggle>
        <Dropdown.Menu alignRight>
          {onReset && (
            <Dropdown.Item onClick={onReset} disabled={isResetDisabled}>
              <FontAwesomeIcon icon={faHistory} fixedWidth /> Reset
            </Dropdown.Item>
          )}
          <Dropdown.Item onClick={onRemove} disabled={disabled}>
            <FontAwesomeIcon icon={faTrash} fixedWidth /> Remove
          </Dropdown.Item>
          {onAddToRecipe && (
            <Dropdown.Item onClick={onAddToRecipe} disabled={disabled}>
              <FontAwesomeIcon icon={faFileImport} fixedWidth /> Add to
              blueprint
            </Dropdown.Item>
          )}
          {onRemoveFromRecipe && (
            <Dropdown.Item onClick={onRemoveFromRecipe} disabled={disabled}>
              <FontAwesomeIcon icon={faFileExport} fixedWidth /> Remove from
              blueprint
            </Dropdown.Item>
          )}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

export default ActionMenu;
