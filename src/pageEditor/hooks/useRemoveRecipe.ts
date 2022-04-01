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
import useRemoveExtension from "@/pageEditor/hooks/useRemoveExtension";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import {
  getIdForElement,
  getRecipeIdForElement,
  selectElements,
} from "@/pageEditor/slices/editorSelectors";
import { uniq } from "lodash";
import { useModals } from "@/components/ConfirmationModal";
import { actions } from "@/pageEditor/slices/editorSlice";

function useRemoveRecipe(): (recipeId: RegistryId) => Promise<void> {
  const dispatch = useDispatch();
  const removeExtension = useRemoveExtension();
  const extensions = useSelector(selectExtensions);
  const elements = useSelector(selectElements);
  const { showConfirmation } = useModals();

  return useCallback(
    async (recipeId: RegistryId) => {
      const confirmed = await showConfirmation({
        title: "Remove Blueprint?",
        message:
          "You can reactivate extensions and blueprints from the PixieBrix Options page",
        submitCaption: "Remove",
      });

      if (!confirmed) {
        return;
      }

      const extensionIds = uniq(
        [...extensions, ...elements]
          .filter((x) => getRecipeIdForElement(x) === recipeId)
          .map((x) => getIdForElement(x))
      );
      for (const extensionId of extensionIds) {
        // eslint-disable-next-line no-await-in-loop
        await removeExtension({ extensionId, shouldShowConfirmation: false });
      }

      dispatch(actions.clearActiveRecipe());
      dispatch(actions.resetMetadataAndOptionsForRecipe(recipeId));
      dispatch(actions.clearDeletedElementsForRecipe(recipeId));
    },
    [dispatch, elements, extensions, removeExtension, showConfirmation]
  );
}

export default useRemoveRecipe;
