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

import { type UUID } from "@/types/stringTypes";
import { useDispatch, useSelector } from "react-redux";
import { selectSessionId } from "@/pageEditor/store/session/sessionSelectors";
import {
  type ConfirmationModalProps,
  useModals,
} from "@/components/ConfirmationModal";
import { useCallback } from "react";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import notify from "@/utils/notify";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { removeDraftModComponents } from "@/contentScript/messenger/api";
import { allFramesInInspectedTab } from "@/pageEditor/context/connection";
import { selectActivatedModComponentsMap } from "@/store/modComponents/modComponentSelectors";
import { selectGetSiblingDraftModComponents } from "@/pageEditor/store/editor/editorSelectors";

type DeleteConfig = {
  modComponentId: UUID;
  /**
   * Show a confirmation modal before deleting the mod component.
   */
  shouldShowConfirmation?: boolean;
};

const DELETE_DRAFT_MOD_COMPONENT_PERMANENT_PROPS: ConfirmationModalProps = {
  title: "Delete starter brick?",
  message: "This action cannot be undone.",
  submitCaption: "Delete",
};

const DELETE_DRAFT_MOD_COMPONENT_RECOVERABLE_PROPS: ConfirmationModalProps = {
  title: "Delete starter brick?",
  message:
    "To recover the starter brick, select the Mod and click Clear Changes.",
  submitCaption: "Delete",
};

/**
 * Returns a callback that deletes a draft mod component from a draft mod in the Page Editor. Does NOT delete the mod
 * component from the corresponding activated mod instance (if any).
 *
 * @see useDeactivateMod
 */
function useDeleteDraftModComponent(): (
  useDeleteConfig: DeleteConfig,
) => Promise<void> {
  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const getSiblingDraftModComponents = useSelector(
    selectGetSiblingDraftModComponents,
  );
  const activatedModComponentsMap = useSelector(
    selectActivatedModComponentsMap,
  );
  const { showConfirmation } = useModals();

  return useCallback(
    async ({ modComponentId, shouldShowConfirmation }) => {
      // Prevent deletion of the last mod component in a mod. The editorSlice state currently stores some mod
      // information on the mod components/form state.
      if (getSiblingDraftModComponents(modComponentId).length === 1) {
        notify.warning(
          "You cannot delete/remove the last starter brick in a mod",
        );
        return;
      }

      if (shouldShowConfirmation) {
        const confirm = await showConfirmation(
          activatedModComponentsMap.get(modComponentId)
            ? DELETE_DRAFT_MOD_COMPONENT_RECOVERABLE_PROPS
            : DELETE_DRAFT_MOD_COMPONENT_PERMANENT_PROPS,
        );

        if (!confirm) {
          return;
        }
      }

      reportEvent(Events.PAGE_EDITOR_MOD_COMPONENT_REMOVE, {
        sessionId,
        modComponentId,
      });

      try {
        // Remove the mod component form state from the Page Editor
        dispatch(
          editorActions.markModComponentFormStateAsDeleted(modComponentId),
        );

        // Stop running the draft on the page
        removeDraftModComponents(allFramesInInspectedTab, modComponentId);
      } catch (error) {
        notify.error({
          message: "Error removing mod component",
          error,
        });
      }
    },
    [
      dispatch,
      sessionId,
      showConfirmation,
      activatedModComponentsMap,
      getSiblingDraftModComponents,
    ],
  );
}

export default useDeleteDraftModComponent;
