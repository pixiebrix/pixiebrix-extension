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

import { actions } from "@/pageEditor/store/editor/editorSlice";
import { useDispatch, useSelector } from "react-redux";
import { useModals } from "@/components/ConfirmationModal";
import { useCallback } from "react";
import { modComponentToFormState } from "@/pageEditor/starterBricks/adapter";
import reportError from "@/telemetry/reportError";
import { selectSessionId } from "@/pageEditor/store/session/sessionSelectors";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import { type UUID } from "@/types/stringTypes";
import { useAllModDefinitions } from "@/modDefinitions/modDefinitionHooks";

import { selectActivatedModComponents } from "@/store/modComponents/modComponentSelectors";

type Config = {
  modComponentId: UUID;
  shouldShowConfirmation?: boolean;
};

/**
 * Hook that returns a callback to clear unsaved changes for a given mod component id.
 * @see useClearModChanges
 */
function useClearModComponentChanges(): (
  useClearModComponentChangesConfig: Config,
) => Promise<void> {
  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const activatedModComponents = useSelector(selectActivatedModComponents);
  const { data: mods } = useAllModDefinitions();
  const { showConfirmation } = useModals();

  return useCallback(
    async ({ modComponentId, shouldShowConfirmation = true }) => {
      if (shouldShowConfirmation) {
        const confirm = await showConfirmation({
          title: "Clear Mod Component Changes?",
          message:
            "Any changes you made to this mod component since the last save will be lost",
          submitCaption: "Clear Changes",
        });

        if (!confirm) {
          return;
        }
      }

      reportEvent(Events.PAGE_EDITOR_CLEAR_CHANGES, {
        sessionId,
        modComponentId,
      });

      try {
        const activatedModComponent = activatedModComponents.find(
          (x) => x.id === modComponentId,
        );
        if (activatedModComponent == null) {
          dispatch(actions.removeModComponentFormState(modComponentId));
        } else {
          const formState = await modComponentToFormState(
            activatedModComponent,
          );
          dispatch(actions.resetActivatedModComponentFormState(formState));
        }
      } catch (error) {
        reportError(error);
        dispatch(actions.adapterError({ uuid: modComponentId, error }));
      }
    },
    [dispatch, mods, sessionId, activatedModComponents, showConfirmation],
  );
}

export default useClearModComponentChanges;
