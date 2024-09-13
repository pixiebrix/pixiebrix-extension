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

import useAddNewModComponent from "@/pageEditor/hooks/useAddNewModComponent";
import { useAvailableFormStateAdapters } from "@/pageEditor/starterBricks/adapter";
import EllipsisMenu, {
  type EllipsisMenuItem,
} from "@/components/ellipsisMenu/EllipsisMenu";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClone,
  faHistory,
  faPlus,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import styles from "@/pageEditor/modListingPanel/actionMenus/ActionMenu.module.scss";
import React, { useCallback, useMemo } from "react";
import { type ModMetadata } from "@/types/modComponentTypes";
import { useDispatch, useSelector } from "react-redux";
import { selectModIsDirty } from "@/pageEditor/store/editor/editorSelectors";
import useSaveMod from "@/pageEditor/hooks/useSaveMod";
import useResetMod from "@/pageEditor/hooks/useResetMod";
import useDeactivateMod from "@/pageEditor/hooks/useDeactivateMod";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import SaveButton from "@/pageEditor/modListingPanel/SaveButton";

/**
 * Action menu for a mod
 *
 * Mod actions include:
 * - Save Mod
 * - Clear Changes (reset)
 * - Add Starter Brick to Mod
 * - Make a copy of the Mod
 * - Deactivate the Mod
 *
 * @param modMetadata the metadata of the mod
 */
const ModActionMenu: React.FC<{ modMetadata: ModMetadata }> = ({
  modMetadata,
}) => {
  const dispatch = useDispatch();
  const { id: modId, name } = modMetadata;
  const isDirty = useSelector(selectModIsDirty(modId));

  const { save: saveMod, isSaving: isSavingMod } = useSaveMod();
  const resetMod = useResetMod();
  const addNewModComponent = useAddNewModComponent(modMetadata);
  const deactivateMod = useDeactivateMod();

  const onCopyMod = useCallback(() => {
    dispatch(actions.showCreateModModal({ keepLocalCopy: true }));
  }, [dispatch]);

  const modComponentFormStateAdapters = useAvailableFormStateAdapters();
  const addStarterBrickSubMenu = useMemo(
    () =>
      modComponentFormStateAdapters.map((adapter) => ({
        title: adapter.label,
        action() {
          addNewModComponent(adapter.starterBrickType);
        },
        icon: <FontAwesomeIcon icon={adapter.icon} fixedWidth />,
      })),
    [addNewModComponent, modComponentFormStateAdapters],
  );

  const menuItems: EllipsisMenuItem[] = [
    {
      title: "Clear Changes",
      icon: <FontAwesomeIcon icon={faHistory} fixedWidth />,
      action: async () => resetMod(modId),
      disabled: !isDirty || isSavingMod,
    },
    {
      title: "Add Starter Brick",
      icon: <FontAwesomeIcon icon={faPlus} fixedWidth />,
      submenu: addStarterBrickSubMenu,
    },
    {
      title: "Make a copy",
      icon: <FontAwesomeIcon icon={faClone} fixedWidth />,
      action: onCopyMod,
      disabled: isSavingMod,
    },
    {
      title: "Deactivate",
      icon: <FontAwesomeIcon icon={faTimes} fixedWidth />,
      action: async () => deactivateMod({ modId }),
      disabled: isSavingMod,
    },
  ];

  return (
    <div className={styles.root}>
      <SaveButton
        ariaLabel={`${name} - Save Mod`}
        onClick={async () => saveMod(modId)}
        disabled={!isDirty || isSavingMod}
      />
      <EllipsisMenu
        ariaLabel={`${name} - Ellipsis`}
        items={menuItems}
        classNames={{ menu: styles.menu, menuButton: styles.ellipsisMenu }}
        portal={true}
      />
    </div>
  );
};

export default ModActionMenu;
