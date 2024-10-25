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
import useDeleteDraftModComponent from "@/pageEditor/hooks/useDeleteDraftModComponent";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { useDispatch, useSelector } from "react-redux";
import { selectModComponentIsDirty } from "@/pageEditor/store/editor/editorSelectors";
import useClearModComponentChanges from "@/pageEditor/hooks/useClearModComponentChanges";
import { actions } from "@/pageEditor/store/editor/editorSlice";

const ModComponentActionMenu: React.FC<{
  modComponentFormState: ModComponentFormState;
  labelRoot: string;
}> = ({ modComponentFormState, labelRoot }) => {
  const dispatch = useDispatch();

  const deleteDraftModComponent = useDeleteDraftModComponent();
  const clearModComponentChanges = useClearModComponentChanges();

  const isDirty = useSelector(
    selectModComponentIsDirty(modComponentFormState.uuid),
  );

  const menuItems: EllipsisMenuItem[] = [
    {
      title: "Clear Changes",
      icon: <FontAwesomeIcon icon={faHistory} fixedWidth />,
      action: async () =>
        clearModComponentChanges({
          modComponentId: modComponentFormState.uuid,
        }),
      // Always show Clear Changes button, even if there are no changes so the UI is more consistent / the user doesn't
      // wonder why the menu item is missing
      disabled: !isDirty,
      hide: !modComponentFormState.installed,
    },
    {
      title: "Duplicate",
      icon: <FontAwesomeIcon icon={faClone} fixedWidth />,
      async action() {
        dispatch(
          // Duplicate the mod component within the current mod
          actions.duplicateActiveModComponent(),
        );
      },
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
      async action() {
        dispatch(
          actions.showMoveCopyToModModal({
            moveOrCopy: "move",
          }),
        );
      },
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
      async action() {
        dispatch(actions.showMoveCopyToModModal({ moveOrCopy: "copy" }));
      },
    },
    {
      title: "Delete",
      icon: <FontAwesomeIcon icon={faTrash} fixedWidth />,
      async action() {
        await deleteDraftModComponent({
          modComponentId: modComponentFormState.uuid,
          shouldShowConfirmation: true,
        });
      },
    },
  ];

  return (
    <div className={styles.root}>
      <EllipsisMenu
        portal
        ariaLabel={labelRoot ? `${labelRoot} - Ellipsis` : undefined}
        items={menuItems}
        classNames={{ menu: styles.menu, menuButton: styles.ellipsisMenu }}
      />
    </div>
  );
};

export default ModComponentActionMenu;
