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
import SaveButton from "@/pageEditor/sidebar/SaveButton";
import {
  faFileExport,
  faFileImport,
  faHistory,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styles from "./ActionMenu.module.scss";
import EllipsisMenu, {
  EllipsisMenuItem,
} from "@/components/ellipsisMenu/EllipsisMenu";

export type ActionMenuProps = {
  onSave: () => Promise<void>;
  onRemove: () => Promise<void>;
  onReset?: () => Promise<void>;
  isDirty?: boolean;
  onAddToRecipe?: () => Promise<void>;
  onRemoveFromRecipe?: () => Promise<void>;
  disabled?: boolean;
};

const ActionMenu: React.FC<ActionMenuProps> = ({
  onSave,
  onRemove,
  onReset,
  isDirty,
  onAddToRecipe,
  onRemoveFromRecipe,
  disabled,
}) => {
  const menuItems: EllipsisMenuItem[] = [
    {
      title: (
        <>
          <FontAwesomeIcon icon={faHistory} fixedWidth /> Reset
        </>
      ),
      hide: !onReset,
      action: onReset,
      disabled: !isDirty || disabled,
    },
    {
      title: (
        <>
          <FontAwesomeIcon icon={faTrash} fixedWidth /> Remove
        </>
      ),
      action: onRemove,
      disabled,
    },
    {
      title: (
        <>
          <FontAwesomeIcon
            icon={faFileImport}
            fixedWidth
            className={styles.addIcon}
          />{" "}
          Add to blueprint
        </>
      ),
      hide: !onAddToRecipe,
      action: onAddToRecipe,
      disabled,
    },
    {
      title: (
        <>
          <FontAwesomeIcon
            icon={faFileExport}
            fixedWidth
            className={styles.removeIcon}
          />{" "}
          Remove from blueprint
        </>
      ),
      hide: !onRemoveFromRecipe,
      action: onRemoveFromRecipe,
      disabled,
    },
  ];

  return (
    <div className={styles.root}>
      <SaveButton onClick={onSave} disabled={!isDirty || disabled} />
      <EllipsisMenu items={menuItems} toggleClassName={styles.toggle} />
    </div>
  );
};

export default ActionMenu;
