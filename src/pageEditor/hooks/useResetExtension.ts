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

import { actions } from "@/pageEditor/slices/editorSlice";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensions } from "@/store/extensionsSelectors";
import { useModals } from "@/components/ConfirmationModal";
import { useCallback } from "react";
import { extensionToFormState } from "@/pageEditor/extensionPoints/adapter";
import reportError from "@/telemetry/reportError";
import { useGetRecipesQuery } from "@/services/api";
import { initRecipeOptionsIfNeeded } from "@/pageEditor/extensionPoints/base";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import { reportEvent } from "@/telemetry/events";
import { FormState } from "@/pageEditor/extensionPoints/formStateTypes";

type Config = {
  element: FormState;
  shouldShowConfirmation?: boolean;
};
function useResetExtension(): (useResetConfig: Config) => Promise<void> {
  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const installed = useSelector(selectExtensions);
  const { data: recipes } = useGetRecipesQuery();
  const { showConfirmation } = useModals();

  return useCallback(
    async ({ element, shouldShowConfirmation = true }) => {
      if (shouldShowConfirmation) {
        const confirm = await showConfirmation({
          title: "Reset Brick?",
          message: "Any changes you made since the last save will be lost",
          submitCaption: "Reset",
        });

        if (!confirm) {
          return;
        }
      }

      reportEvent("PageEditorReset", {
        sessionId,
        extensionId: element.uuid,
      });

      try {
        const extension = installed.find((x) => x.id === element.uuid);
        if (extension == null) {
          dispatch(actions.removeElement(element.uuid));
        } else {
          const formState = await extensionToFormState(extension);
          initRecipeOptionsIfNeeded(formState, recipes);
          dispatch(actions.resetInstalled(formState));
        }
      } catch (error) {
        reportError(error);
        dispatch(actions.adapterError({ uuid: element.uuid, error }));
      }
    },
    [dispatch, recipes, sessionId, installed, showConfirmation]
  );
}

export default useResetExtension;
