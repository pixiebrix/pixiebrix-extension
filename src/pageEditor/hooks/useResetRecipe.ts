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

import { useCallback } from "react";
import { RegistryId } from "@/core";
import { actions } from "@/pageEditor/slices/editorSlice";
import { useModals } from "@/components/ConfirmationModal";
import { useDispatch, useSelector } from "react-redux";
import useResetExtension from "@/pageEditor/hooks/useResetExtension";
import { selectElements } from "@/pageEditor/slices/editorSelectors";

function useResetRecipe(): (recipeId: RegistryId) => Promise<void> {
  const { showConfirmation } = useModals();
  const dispatch = useDispatch();
  const resetElement = useResetExtension();
  const elements = useSelector(selectElements);

  return useCallback(
    async (recipeId: RegistryId) => {
      const confirmed = await showConfirmation({
        title: "Reset Blueprint?",
        message:
          "Unsaved changes to extensions within this blueprint, or to blueprint options and metadata, will be lost.",
        submitCaption: "Reset",
      });
      if (!confirmed) {
        return;
      }

      for (const element of elements.filter(
        (element) => element.recipe?.id === recipeId
      )) {
        // eslint-disable-next-line no-await-in-loop
        await resetElement({ element, shouldShowConfirmation: false });
      }

      dispatch(actions.resetMetadataAndOptionsForRecipe(recipeId));
      dispatch(actions.restoreDeletedElementsForRecipe(recipeId));
    },
    [dispatch, elements, resetElement, showConfirmation]
  );
}

export default useResetRecipe;
