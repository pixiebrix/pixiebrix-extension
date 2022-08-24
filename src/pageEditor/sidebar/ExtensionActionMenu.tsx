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
import useRemoveExtension from "@/pageEditor/hooks/useRemoveExtension";
import useResetExtension from "@/pageEditor/hooks/useResetExtension";
import useSaveExtension from "@/pageEditor/hooks/useSaveExtension";
import ActionMenu from "@/components/sidebar/ActionMenu";
import { actions } from "@/pageEditor/slices/editorSlice";

const ExtensionActionMenu: React.FC<{ elementId: UUID }> = ({ elementId }) => {
  const dispatch = useDispatch();

  const elements = useSelector(selectElements);
  const element = elements.find((element) => element.uuid === elementId);
  const isDirty = useSelector(selectElementIsDirty(elementId));
  const { save: saveExtension, isSaving } = useSaveExtension();
  const removeExtension = useRemoveExtension();
  const resetExtension = useResetExtension();

  const remove = async () => {
    await removeExtension({ extensionId: elementId });
  };

  const save = element.recipe
    ? undefined
    : async () => {
        await saveExtension(elementId);
      };

  const reset = element.installed
    ? async () => {
        await resetExtension({ elementId });
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
      disabled={isSaving}
    />
  );
};

export default ExtensionActionMenu;
