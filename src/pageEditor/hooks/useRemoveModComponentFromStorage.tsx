/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import {
  type ConfirmationModalProps,
  useModals,
} from "@/components/ConfirmationModal";
import React, { useCallback } from "react";
import reportEvent from "@/telemetry/reportEvent";
import { Events } from "@/telemetry/events";
import notify from "@/utils/notify";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { actions as extensionsActions } from "@/store/extensionsSlice";
import { clearDynamicElements } from "@/contentScript/messenger/api";
import { thisTab } from "@/pageEditor/utils";
import { removeExtensionsFromAllTabs } from "@/store/uninstallUtils";

type Config = {
  extensionId: UUID;
  shouldShowConfirmation?: boolean;
  confirmationModal?: ConfirmationModalProps;
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
 * Returns a callback that removes a mod component from the Page Editor and Extension Storage.
 *
 * For mod components (packaged inside a mod), this callback will effectively delete the mod component.
 * For standalone mods, this callback will simply deactivate the mod and remove it from the Page Editor.
 *
 * In both cases, unsaved changes will be lost.
 **/
export function useRemoveModComponentFromStorage(): (
  useRemoveConfig: Config,
) => Promise<void> {
  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const { showConfirmation } = useModals();

  return useCallback(
    async ({ extensionId, confirmationModal }) => {
      console.debug(`pageEditor: remove mod component with id ${extensionId}`);

      if (confirmationModal) {
        const confirm = await showConfirmation(confirmationModal);

        if (!confirm) {
          return;
        }
      }

      reportEvent(Events.PAGE_EDITOR_REMOVE, {
        sessionId,
        extensionId,
      });

      try {
        // Remove from Page Editor
        // Equivalent of @/store/dynamicElementStorage.ts:removeDynamicElements
        dispatch(editorActions.removeElement(extensionId));

        // Remove from options slice / extension storage
        dispatch(extensionsActions.removeExtension({ extensionId }));

        // Remove from the host page
        try {
          await clearDynamicElements(thisTab, {
            uuid: extensionId,
          });
        } catch (error) {
          // Element might not be on the page anymore
          console.info("Cannot clear dynamic element from page", { error });
        }

        removeExtensionsFromAllTabs([extensionId]);
      } catch (error: unknown) {
        notify.error({
          message: "Error removing mod",
          error,
        });
      }
    },
    [dispatch, sessionId],
  );
}

export const useDeactivateModComponent = (): ((
  useRemoveConfig: Config,
) => Promise<void>) => {
  const removeModComponent = useRemoveModComponentFromStorage();
  const { showConfirmation } = useModals();

  return useCallback(
    async ({ extensionId, shouldShowConfirmation = true }) => {
      if (shouldShowConfirmation) {
        const confirm = await showConfirmation({
          title: "Deactivate Mod?",
          message: (
            <>
              Unsaved changes will be lost. You can reactivate or delete mods
              from the{" "}
              <a href="/options.html" target="_blank">
                PixieBrix Extension Console
              </a>
              .
            </>
          ),
          submitCaption: "Deactivate",
        });

        if (!confirm) {
          return;
        }
      }

      await removeModComponent({ extensionId });
    },
    [removeModComponent, showConfirmation],
  );
};

export const useDeleteModComponent = (): ((
  useRemoveConfig: Config,
) => Promise<void>) => {
  const removeModComponent = useRemoveModComponentFromStorage();
  const { showConfirmation } = useModals();

  return useCallback(
    async ({ extensionId, shouldShowConfirmation = true }) => {
      if (shouldShowConfirmation) {
        const confirm = await showConfirmation({
          title: "Delete starter brick?",
          message: "This action cannot be undone.",
          submitCaption: "Delete",
        });

        if (!confirm) {
          return;
        }
      }

      await removeModComponent({ extensionId });
    },
    [removeModComponent, showConfirmation],
  );
};
