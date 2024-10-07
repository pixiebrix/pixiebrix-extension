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
  faPlus,
  faTimes,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styles from "./ActionMenu.module.scss";
import EllipsisMenu, {
  type EllipsisMenuItem,
} from "@/components/ellipsisMenu/EllipsisMenu";
import { type AddNewModComponent } from "@/pageEditor/hooks/useAddNewModComponent";
import { useAvailableFormStateAdapters } from "@/pageEditor/starterBricks/adapter";

type ActionMenuProps = {
  isActive: boolean;
  labelRoot?: string;
  onSave: (() => Promise<void>) | undefined;
  onDelete?: () => Promise<void>;
  onDeactivate?: () => Promise<void>;
  onClone: () => Promise<void>;
  onClearChanges?: () => Promise<void>;
  isDirty?: boolean;
  onAddToMod?: () => Promise<void>;
  onRemoveFromMod?: () => Promise<void>;
  disabled?: boolean;
  onAddStarterBrick?: AddNewModComponent;
};

const ActionMenu: React.FC<ActionMenuProps> = ({
  isActive,
  labelRoot,
  onSave,
  onDelete = null,
  onDeactivate = null,
  onClone,
  onClearChanges = null,
  isDirty,
  onAddToMod = null,
  onRemoveFromMod = null,
  disabled,
  onAddStarterBrick = null,
}) => {
  const modComponentFormStateAdapters = useAvailableFormStateAdapters();

  const menuItems: EllipsisMenuItem[] = [
    {
      title: "Clear Changes",
      icon: <FontAwesomeIcon icon={faHistory} fixedWidth />,
      action: onClearChanges,
      // Always show Clear Changes button, even if there are no changes so the UI is more consistent / the user doesn't
      // wonder why the menu item is missing
      disabled: !isDirty || disabled || !onClearChanges,
    },
    {
      title: "Add Starter Brick",
      icon: <FontAwesomeIcon icon={faPlus} fixedWidth />,
      submenu: modComponentFormStateAdapters.map((adapter) => ({
        title: adapter.label,
        action: onAddStarterBrick
          ? () => {
              onAddStarterBrick(adapter);
            }
          : null,
        icon: <FontAwesomeIcon icon={adapter.icon} fixedWidth />,
      })),
      hide: !onAddStarterBrick,
    },
    {
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
      hide: !onAddToMod,
    },
    {
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
      hide: !onRemoveFromMod,
    },
    {
      title: "Make a copy",
      icon: <FontAwesomeIcon icon={faClone} fixedWidth />,
      action: onClone,
      disabled,
    },
    {
      title: "Delete",
      icon: <FontAwesomeIcon icon={faTrash} fixedWidth />,
      action: onDelete,
      disabled,
      hide: !onDelete,
    },
    {
      title: "Deactivate",
      icon: <FontAwesomeIcon icon={faTimes} fixedWidth />,
      action: onDeactivate,
      disabled,
      hide: !onDeactivate,
    },
  ];

  return (
    <div className={styles.root}>
      {onSave != null && (
        <SaveButton
          ariaLabel={labelRoot ? `${labelRoot} - Save` : undefined}
          onClick={onSave}
          disabled={!isDirty || disabled}
        />
      )}
      {isActive && (
        <EllipsisMenu
          ariaLabel={labelRoot ? `${labelRoot} - Ellipsis` : undefined}
          items={menuItems}
          classNames={{ menu: styles.menu, menuButton: styles.ellipsisMenu }}
          portal={true}
        />
      )}
    </div>
  );
};

export default ActionMenu;
