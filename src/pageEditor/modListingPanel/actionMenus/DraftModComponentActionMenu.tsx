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
import type { ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import EllipsisMenu, {
  type EllipsisMenuItem,
} from "@/components/ellipsisMenu/EllipsisMenu";
import styles from "./ActionMenu.module.scss";
import useResetModComponent from "@/pageEditor/hooks/useResetModComponent";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faClone, faHistory } from "@fortawesome/free-solid-svg-icons";
import { useDispatch, useSelector } from "react-redux";
import { selectModComponentIsDirty } from "@/pageEditor/store/editor/editorSelectors";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import {
  DELETE_STARTER_BRICK_MODAL_PROPS,
  useRemoveModComponentFromStorage,
} from "@/pageEditor/hooks/useRemoveModComponentFromStorage";

/**
 * Action menu for a (selected) draft mod component
 *
 * Mod Component actions include:
 * - Clear Changes (reset)
 * - Duplicate component within current mod
 * - Move component to another mod
 * - Copy component to another mod
 * - Delete component from the mod
 *
 */
const DraftModComponentActionMenu: React.FC<{
  modComponentFormState: ModComponentFormState;
  isNested?: boolean;
}> = ({ modComponentFormState, isNested }) => {
  const dispatch = useDispatch();
  const resetModComponent = useResetModComponent();
  const isDirty = useSelector(
    selectModComponentIsDirty(modComponentFormState.uuid),
  );
  const removeModComponentFromStorage = useRemoveModComponentFromStorage();

  const menuItems: EllipsisMenuItem[] = [
    {
      title: "Clear Changes",
      icon: <FontAwesomeIcon icon={faHistory} fixedWidth />,
      action: async () =>
        resetModComponent({ modComponentId: modComponentFormState.uuid }),
      disabled: !isDirty,
    },
    {
      title: "Duplicate",
      icon: <FontAwesomeIcon icon={faClone} fixedWidth />,
      action() {
        dispatch(actions.duplicateActiveModComponent());
      },
    },
    {
      title: "Move from Mod",
      icon: <FontAwesomeIcon icon={faHistory} fixedWidth />,
      action() {
        dispatch(actions.showMoveFromModModal({ keepLocalCopy: false }));
      },
    },
    {
      title: "Copy to Mod",
      icon: <FontAwesomeIcon icon={faHistory} fixedWidth />,
      action() {
        dispatch(actions.showMoveFromModModal({ keepLocalCopy: true }));
      },
    },
    {
      title: "Delete component",
      icon: <FontAwesomeIcon icon={faHistory} fixedWidth />,
      action: async () =>
        removeModComponentFromStorage({
          modComponentId: modComponentFormState.uuid,
          showConfirmationModal: DELETE_STARTER_BRICK_MODAL_PROPS,
        }),
    },
  ];

  return (
    <EllipsisMenu
      ariaLabel={`${modComponentFormState.label} - Ellipsis`}
      items={menuItems}
      classNames={{ menu: styles.menu, menuButton: styles.ellipsisMenu }}
      portal={true}
    />
  );
};

export default DraftModComponentActionMenu;
