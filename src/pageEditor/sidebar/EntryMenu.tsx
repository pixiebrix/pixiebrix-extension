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
import AddToRecipeButton from "@/pageEditor/sidebar/actionButtons/AddToRecipeButton";
import RemoveFromRecipeButton from "@/pageEditor/sidebar/actionButtons/RemoveFromRecipeButton";
import RemoveButton from "@/pageEditor/sidebar/actionButtons/RemoveButton";
import ResetButton from "@/pageEditor/sidebar/actionButtons/ResetButton";
import SaveButton from "@/pageEditor/sidebar/actionButtons/SaveButton";
import { useSelector } from "react-redux";
import { selectElementIsDirty } from "@/pageEditor/slices/editorSelectors";
import { FormState } from "@/pageEditor/pageEditorTypes";
import { noop } from "lodash";
import MenuButton from "@/pageEditor/sidebar/actionButtons/MenuButton";

const EntryMenu: React.FC<{
  item: FormState;
  isOpen: boolean;
  toggleMenu: () => void;
}> = ({ item, isOpen, toggleMenu }) => {
  const isDirty = useSelector(selectElementIsDirty(item.uuid));
  const isInRecipe = item.recipe !== undefined;

  const showAddToRecipe = isOpen && !isInRecipe;
  const showRemoveFromRecipe = isOpen && isInRecipe;
  const showRemove = isOpen;
  const showReset = isOpen;
  const isResetDisabled = !isDirty;
  const showSave = !isInRecipe;
  const isSaveDisabled = !isDirty;

  return (
    <>
      {isDirty && !isOpen && (
        <span className={cx(styles.icon, "text-danger")}>
          <UnsavedChangesIcon />
        </span>
      )}
      {showAddToRecipe && <AddToRecipeButton onClick={noop} />}
      {showRemoveFromRecipe && <RemoveFromRecipeButton onClick={noop} />}
      {showRemove && <RemoveButton onClick={noop} />}
      {showReset && <ResetButton onClick={noop} disabled={isResetDisabled} />}
      {showSave && <SaveButton onClick={noop} disabled={isSaveDisabled} />}
      <MenuButton onClick={toggleMenu} />
    </>
  );
};

export default EntryMenu;
