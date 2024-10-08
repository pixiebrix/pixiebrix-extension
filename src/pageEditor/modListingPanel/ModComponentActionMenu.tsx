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
import {
  faClone,
  faFileExport,
  faHistory,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styles from "./ActionMenu.module.scss";
import EllipsisMenu, {
  type EllipsisMenuItem,
} from "@/components/ellipsisMenu/EllipsisMenu";

type OptionalAction = (() => Promise<void>) | undefined;

type ActionMenuProps = {
  labelRoot: string;
  isDirty: boolean;
  isActive: boolean;
  onDelete: () => Promise<void>;
  onDuplicate: () => Promise<void>;
  onClearChanges: OptionalAction;
  onMoveToMod: () => Promise<void>;
  onCopyToMod: () => Promise<void>;
};

const ModComponentActionMenu: React.FC<ActionMenuProps> = ({
  isActive,
  labelRoot,
  isDirty,
  onDelete,
  onDuplicate,
  onClearChanges = null,
  onMoveToMod,
  onCopyToMod,
}) => {
  const menuItems: EllipsisMenuItem[] = [
    {
      title: "Clear Changes",
      icon: <FontAwesomeIcon icon={faHistory} fixedWidth />,
      action: onClearChanges,
      // Always show Clear Changes button, even if there are no changes so the UI is more consistent / the user doesn't
      // wonder why the menu item is missing
      disabled: !isDirty || !onClearChanges,
    },
    {
      title: "Duplicate",
      icon: <FontAwesomeIcon icon={faClone} fixedWidth />,
      action: onDuplicate,
    },
    {
      title: "Move to mod",
      icon: (
        <FontAwesomeIcon
          icon={faFileExport}
          fixedWidth
          className={styles.moveIcon}
        />
      ),
      action: onMoveToMod,
    },
    {
      title: "Copy to mod",
      icon: (
        <FontAwesomeIcon
          icon={faFileExport}
          fixedWidth
          className={styles.moveIcon}
        />
      ),
      action: onCopyToMod,
    },
    {
      title: "Delete",
      icon: <FontAwesomeIcon icon={faTrash} fixedWidth />,
      action: onDelete,
    },
  ];

  return (
    <div className={styles.root}>
      {isActive && (
        <EllipsisMenu
          portal
          ariaLabel={labelRoot ? `${labelRoot} - Ellipsis` : undefined}
          items={menuItems}
          classNames={{ menu: styles.menu, menuButton: styles.ellipsisMenu }}
        />
      )}
    </div>
  );
};

export default ModComponentActionMenu;
