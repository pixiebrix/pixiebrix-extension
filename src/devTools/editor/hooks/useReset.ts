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

import { IExtension } from "@/core";
import { actions, FormState } from "@/devTools/editor/editorSlice";
import { useDispatch } from "react-redux";
import { useModals } from "@/components/ConfirmationModal";
import { useCallback } from "react";
import { extensionToFormState } from "@/devTools/editor/extensionPoints/adapter";
import { reportError } from "@/telemetry/logging";

function useReset(installed: IExtension[], element: FormState): () => void {
  const dispatch = useDispatch();
  const { showConfirmation } = useModals();

  return useCallback(async () => {
    const confirm = await showConfirmation({
      title: "Reset Brick?",
      message: "Any changes you made since the last save will be lost",
      submitCaption: "Reset",
    });

    if (!confirm) {
      return;
    }

    try {
      const extension = installed.find((x) => x.id === element.uuid);
      const state = await extensionToFormState(extension);
      dispatch(actions.resetInstalled(state));
    } catch (error: unknown) {
      reportError(error);
      dispatch(actions.adapterError({ uuid: element.uuid, error }));
    }
  }, [showConfirmation, dispatch, element.uuid, installed]);
}

export default useReset;
