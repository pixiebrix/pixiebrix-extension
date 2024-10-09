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
  faHistory,
  faPlus,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import styles from "./ActionMenu.module.scss";
import EllipsisMenu, {
  type EllipsisMenuItem,
} from "@/components/ellipsisMenu/EllipsisMenu";
import { type AddNewModComponent } from "@/pageEditor/hooks/useAddNewModComponent";
import { useAvailableFormStateAdapters } from "@/pageEditor/starterBricks/adapter";
import useDeactivateMod from "@/pageEditor/hooks/useDeactivateMod";
import { type RegistryId } from "@/types/registryTypes";
import useSaveMod from "@/pageEditor/hooks/useSaveMod";

type OptionalAction = (() => Promise<void>) | undefined;

type ActionMenuProps = {
  modId: RegistryId;
  isDirty: boolean;
  isActive: boolean;
  labelRoot: string;
  onMakeCopy: () => Promise<void>;
  onAddStarterBrick: AddNewModComponent;
  onClearChanges: OptionalAction;
};

const ModActionMenu: React.FC<ActionMenuProps> = ({
  modId,
  isActive,
  labelRoot,
  isDirty,
  onAddStarterBrick,
  onMakeCopy,
  onClearChanges = null,
}) => {
  const modComponentFormStateAdapters = useAvailableFormStateAdapters();
  const deactivateMod = useDeactivateMod();
  const saveMod = useSaveMod();

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
      title: "Add Starter Brick",
      icon: <FontAwesomeIcon icon={faPlus} fixedWidth />,
      submenu: modComponentFormStateAdapters.map((adapter) => ({
        title: adapter.label,
        action() {
          onAddStarterBrick(adapter);
        },
        icon: <FontAwesomeIcon icon={adapter.icon} fixedWidth />,
      })),
      hide: !onAddStarterBrick,
    },
    {
      title: "Make a copy",
      icon: <FontAwesomeIcon icon={faClone} fixedWidth />,
      action: onMakeCopy,
    },
    {
      title: "Deactivate",
      icon: <FontAwesomeIcon icon={faTimes} fixedWidth />,
      async action() {
        await deactivateMod({ modId });
      },
    },
  ];

  return (
    <div className={styles.root}>
      <SaveButton
        ariaLabel={labelRoot ? `${labelRoot} - Save` : undefined}
        onClick={async () => {
          await saveMod(modId);
        }}
        disabled={!isDirty}
      />
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

export default ModActionMenu;
