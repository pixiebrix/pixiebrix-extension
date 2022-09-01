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
import { UUID } from "@/core";
import { useDispatch, useSelector } from "react-redux";
import {
  selectElementIsDirty,
  selectElements,
} from "@/pageEditor/slices/editorSelectors";
import ActionMenu from "@/components/sidebar/ActionMenu";
import { actions } from "@/pageEditor/slices/editorSlice";
import useSaveExtension from "@/pageEditor/hooks/useSaveExtension";
import useResetExtension from "@/pageEditor/hooks/useResetExtension";
import useRemoveExtension from "@/pageEditor/hooks/useRemoveExtension";

type ExtensionActionMenuProps = {
  extensionId: UUID;
};

const ExtensionActionMenu: React.FC<ExtensionActionMenuProps> = ({
  extensionId,
}) => {
  const dispatch = useDispatch();

  const elements = useSelector(selectElements);
  const element = elements.find((element) => element.uuid === extensionId);
  const isDirty = useSelector(selectElementIsDirty(extensionId));

  const { save: saveExtension, isSaving: isSavingExtension } =
    useSaveExtension();
  const resetExtension = useResetExtension();
  const removeExtension = useRemoveExtension();

  const remove = async () => {
    await removeExtension({ extensionId });
  };

  const save = element.recipe
    ? undefined
    : async () => {
        await saveExtension(extensionId);
      };

  const reset = element.installed
    ? async () => {
        await resetExtension({ extensionId });
      }
    : undefined;

  const addToRecipe = element.recipe
    ? undefined
    : async () => {
        dispatch(actions.showAddToRecipeModal());
      };

  const removeFromRecipe = element.recipe
    ? async () => {
        dispatch(actions.showRemoveFromRecipeModal());
      }
    : undefined;

  return (
    <ActionMenu
      onRemove={remove}
      onSave={save}
      onReset={reset}
      isDirty={isDirty}
      onAddToRecipe={addToRecipe}
      onRemoveFromRecipe={removeFromRecipe}
      disabled={isSavingExtension}
    />
  );
};

export default ExtensionActionMenu;
