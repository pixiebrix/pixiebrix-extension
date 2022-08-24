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
import cx from "classnames";
import styles from "@/pageEditor/sidebar/Entry.module.scss";
import { UnsavedChangesIcon } from "@/pageEditor/sidebar/ExtensionIcons";
import SaveButton from "@/pageEditor/sidebar/actionButtons/SaveButton";
import MenuButton, {
  MenuButtonProps,
} from "@/pageEditor/sidebar/actionButtons/MenuButton";
import { Dropdown } from "react-bootstrap";
import {
  faFileExport,
  faFileImport,
  faHistory,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const DropdownToggle = React.forwardRef<HTMLButtonElement, MenuButtonProps>(
  ({ children, onClick }, ref) => <MenuButton onClick={onClick} ref={ref} />
);
DropdownToggle.displayName = "DropdownToggle";

export type EntryMenuProps = {
  onRemove: () => Promise<void>;
  onSave?: () => Promise<void>;
  onReset?: () => Promise<void>;
  isDirty?: boolean;
  onAddToRecipe?: () => Promise<void>;
  onRemoveFromRecipe?: () => Promise<void>;
  disabled?: boolean;
};

const ActionMenu: React.FC<EntryMenuProps> = ({
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
    <>
      {isDirty && (
        <span className={cx(styles.icon, "text-danger")}>
          <UnsavedChangesIcon />
        </span>
      )}
      {onSave && <SaveButton onClick={onSave} disabled={isSaveDisabled} />}
      <Dropdown>
        <Dropdown.Toggle as={DropdownToggle} />
        <Dropdown.Menu>
          <Dropdown.Item onClick={onReset} disabled={isResetDisabled}>
            <FontAwesomeIcon icon={faHistory} fixedWidth /> Reset
          </Dropdown.Item>
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
    </>
  );
};

export default ActionMenu;
