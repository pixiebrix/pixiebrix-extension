/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import SaveButton from "@/pageEditor/modListingPanel/SaveButton";
import {
  faClone,
  faFileExport,
  faFileImport,
  faHistory,
  faPlusSquare,
  faTimes,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styles from "./ActionMenu.module.scss";
import EllipsisMenu, {
  type EllipsisMenuItem,
} from "@/components/ellipsisMenu/EllipsisMenu";
import { type AddNewModComponent } from "@/pageEditor/hooks/useAddNewModComponent";

type ActionMenuProps = {
  labelRoot?: string;
  onSave: () => Promise<void>;
  onDelete?: () => Promise<void>;
  onDeactivate?: () => Promise<void>;
  onClone: () => Promise<void>;
  onReset?: () => Promise<void>;
  isDirty?: boolean;
  onAddToMod?: () => Promise<void>;
  onRemoveFromMod?: () => Promise<void>;
  disabled?: boolean;
  onAddStarterBrick?: AddNewModComponent;
};

const ActionMenu: React.FC<ActionMenuProps> = ({
  labelRoot,
  onSave,
  onDelete,
  onDeactivate,
  onClone,
  onReset,
  isDirty,
  onAddToMod,
  onRemoveFromMod,
  disabled,
  onAddStarterBrick,
}) => {
  // @ts-expect-error -- todo: why is this throwing?
  const menuItems: EllipsisMenuItem[] = [
    onReset && {
      title: "Reset",
      icon: <FontAwesomeIcon icon={faHistory} fixedWidth />,
      action: onReset,
      disabled: !isDirty || disabled,
    },
    onAddStarterBrick && {
      title: "Add Starter Brick",
      icon: <FontAwesomeIcon icon={faPlusSquare} fixedWidth />,
      submenu: [] as EllipsisMenuItem[],
    },
    onAddToMod && {
      title: "Add to mod",
      icon: (
        <FontAwesomeIcon
          icon={faFileImport}
          fixedWidth
          className={styles.addIcon}
        />
      ),
      action: onAddToMod,
      disabled,
    },
    onRemoveFromMod && {
      title: "Move from mod",
      icon: (
        <FontAwesomeIcon
          icon={faFileExport}
          fixedWidth
          className={styles.removeIcon}
        />
      ),
      action: onRemoveFromMod,
      disabled,
    },
    {
      title: "Make a copy",
      icon: <FontAwesomeIcon icon={faClone} fixedWidth />,
      action: onClone,
      disabled,
    },
    onDelete && {
      title: "Delete",
      icon: <FontAwesomeIcon icon={faTrash} fixedWidth />,
      action: onDelete,
      disabled,
    },
    onDeactivate && {
      title: "Deactivate",
      icon: <FontAwesomeIcon icon={faTimes} fixedWidth />,
      action: onDeactivate,
      disabled,
    },
  ].filter(Boolean);

  return (
    <div className={styles.root}>
      <SaveButton
        ariaLabel={labelRoot ? `${labelRoot} - Save` : undefined}
        onClick={onSave}
        disabled={!isDirty || disabled}
      />
      <EllipsisMenu
        ariaLabel={labelRoot ? `${labelRoot} - Ellipsis` : undefined}
        items={menuItems}
        menuButtonClassName={styles.ellipsisMenu}
      />
    </div>
  );
};

export default ActionMenu;
