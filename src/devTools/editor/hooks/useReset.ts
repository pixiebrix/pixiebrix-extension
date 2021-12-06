/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import { actions, FormState } from "@/devTools/editor/slices/editorSlice";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensions } from "@/options/selectors";
import { useModals } from "@/components/ConfirmationModal";
import { useCallback } from "react";
import { extensionToFormState } from "@/devTools/editor/extensionPoints/adapter";
import { reportError } from "@/telemetry/logging";

type Config = {
  element: FormState;
  shouldShowConfirmation?: boolean;
};
function useReset(): (useResetConfig: Config) => void {
  const dispatch = useDispatch();
  const installed = useSelector(selectExtensions);
  const { showConfirmation } = useModals();

  return useCallback(
    async ({ element, shouldShowConfirmation = true }: Config) => {
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

      try {
        const extension = installed.find((x) => x.id === element.uuid);
        const state = await extensionToFormState(extension);
        dispatch(actions.resetInstalled(state));
      } catch (error) {
        reportError(error);
        dispatch(actions.adapterError({ uuid: element.uuid, error }));
      }
    },
    [dispatch, installed, showConfirmation]
  );
}

export default useReset;
