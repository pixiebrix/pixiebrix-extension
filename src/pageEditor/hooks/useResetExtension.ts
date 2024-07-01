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

import { actions } from "@/pageEditor/slices/editorSlice";
import { useDispatch, useSelector } from "react-redux";
import { selectActivatedModComponents } from "@/store/extensionsSelectors";
import { useModals } from "@/components/ConfirmationModal";
import { useCallback } from "react";
import { modComponentToFormState } from "@/pageEditor/starterBricks/adapter";
import reportError from "@/telemetry/reportError";
import { initModOptionsIfNeeded } from "@/pageEditor/starterBricks/base";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { type UUID } from "@/types/stringTypes";
import { useAllModDefinitions } from "@/modDefinitions/modDefinitionHooks";
import { compact } from "lodash";

type Config = {
  extensionId: UUID;
  shouldShowConfirmation?: boolean;
};

function useResetExtension(): (useResetConfig: Config) => Promise<void> {
  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const installed = useSelector(selectActivatedModComponents);
  const { data: mods } = useAllModDefinitions();
  const { showConfirmation } = useModals();

  return useCallback(
    async ({ extensionId: modComponentId, shouldShowConfirmation = true }) => {
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

      reportEvent(Events.PAGE_EDITOR_RESET, {
        sessionId,
        modComponentId,
      });

      try {
        const extension = installed.find((x) => x.id === modComponentId);
        if (extension == null) {
          dispatch(actions.removeModComponentFormState(modComponentId));
        } else {
          const formState = await modComponentToFormState(extension);
          initModOptionsIfNeeded(formState, compact(mods));
          dispatch(actions.resetInstalled(formState));
        }
      } catch (error) {
        reportError(error);
        dispatch(actions.adapterError({ uuid: modComponentId, error }));
      }
    },
    [dispatch, mods, sessionId, installed, showConfirmation],
  );
}

export default useResetExtension;
