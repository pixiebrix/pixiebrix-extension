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
import React, { useCallback } from "react";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import notify from "@/utils/notify";
import { actions as editorActions } from "@/pageEditor/store/editor/editorSlice";
import { actions as modComponentsActions } from "@/store/modComponents/modComponentSlice";
import { removeDraftModComponents } from "@/contentScript/messenger/api";
import { removeModComponentsFromAllTabs } from "@/store/deactivateUtils";
import { allFramesInInspectedTab } from "@/pageEditor/context/connection";

type Config = {
  modComponentId: UUID;
  // Show a confirmation modal with the specified modal props before removing the mod component if defined
  showConfirmationModal?: ConfirmationModalProps;
};

export const DELETE_STARTER_BRICK_MODAL_PROPS: ConfirmationModalProps = {
  title: "Delete starter brick?",
  message: "This action cannot be undone.",
  submitCaption: "Delete",
};

export const DELETE_STANDALONE_MOD_COMPONENT_MODAL_PROPS: ConfirmationModalProps =
  {
    title: "Delete mod?",
    message: "This action cannot be undone.",
    submitCaption: "Delete",
  };

export const DEACTIVATE_MOD_MODAL_PROPS: ConfirmationModalProps = {
  title: "Deactivate Mod?",
  message: (
    <>
      Any unsaved changes will be lost. You can reactivate or delete mods from
      the{" "}
      <a href="/options.html" target="_blank">
        PixieBrix Extension Console
      </a>
      .
    </>
  ),
  submitCaption: "Deactivate",
};

/**
 * Returns a callback that removes a mod component from the Page Editor and Mod Component Storage.
 *
 * For mod components packaged inside a mod and standalone mod components not saved on the cloud, this callback will effectively delete the mod component.
 * For saved standalone mods, this callback will simply deactivate the mod and remove it from the Page Editor.
 *
 * In both cases, unsaved changes will be lost.
 */
export function useRemoveModComponentFromStorage(): (
  useRemoveConfig: Config,
) => Promise<void> {
  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const { showConfirmation } = useModals();

  return useCallback(
    async ({ modComponentId, showConfirmationModal }) => {
      console.debug(
        `pageEditor: remove mod component with id ${modComponentId}`,
      );

      if (showConfirmationModal) {
        const confirm = await showConfirmation(showConfirmationModal);

        if (!confirm) {
          return;
        }
      }

      reportEvent(Events.PAGE_EDITOR_REMOVE, {
        sessionId,
        modComponentId,
      });

      try {
        // Remove the mod component form state from the Page Editor
        dispatch(editorActions.removeModComponentFormState(modComponentId));

        // Remove from options slice / mod component storage
        dispatch(modComponentsActions.removeModComponent({ modComponentId }));

        // Remove from the host page
        try {
          removeDraftModComponents(allFramesInInspectedTab, modComponentId);
        } catch (error) {
          // Element might not be on the page anymore
          console.info("Cannot clear draft mod component from page", { error });
        }

        removeModComponentsFromAllTabs([modComponentId]);
      } catch (error) {
        notify.error({
          message: "Error removing mod",
          error,
        });
      }
    },
    [dispatch, sessionId, showConfirmation],
  );
}
