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
  faFileImport,
  faHistory,
  faTimes,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styles from "./ActionMenu.module.scss";
import EllipsisMenu, {
  type EllipsisMenuItem,
} from "@/components/ellipsisMenu/EllipsisMenu";
import SaveButton from "@/pageEditor/modListingPanel/SaveButton";

type OptionalAction = (() => Promise<void>) | undefined;

type ActionMenuProps = {
  labelRoot: string;
  isDirty: boolean;
  isActive: boolean;
  onDelete: OptionalAction;
  onDuplicate: OptionalAction;
  onClearChanges: OptionalAction;
  onAddToMod: OptionalAction;
  onRemoveFromMod: OptionalAction;
  // TODO: https://github.com/pixiebrix/pixiebrix-extension/issues/9242, remove standalone mod component actions
  onSave: OptionalAction;
  onDeactivate: OptionalAction;
};

const ModComponentActionMenu: React.FC<ActionMenuProps> = ({
  isActive,
  labelRoot,
  isDirty,
  onDelete = null,
  onDuplicate = null,
  onClearChanges = null,
  onAddToMod = null,
  onRemoveFromMod = null,
  // Standalone Mod Component Actions
  onSave = null,
  onDeactivate = null,
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
      hide: !onDuplicate,
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
      hide: !onRemoveFromMod,
    },
    {
      title: "Delete",
      icon: <FontAwesomeIcon icon={faTrash} fixedWidth />,
      action: onDelete,
      hide: !onDelete,
    },
    {
      title: "Deactivate",
      icon: <FontAwesomeIcon icon={faTimes} fixedWidth />,
      action: onDeactivate,
      hide: !onDeactivate,
    },
  ];

  return (
    <div className={styles.root}>
      {onSave != null && (
        <SaveButton
          ariaLabel={labelRoot ? `${labelRoot} - Save` : undefined}
          onClick={onSave}
          disabled={!isDirty}
        />
      )}
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
