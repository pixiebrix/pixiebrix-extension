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

import { UUID } from "@/core";
import { useDispatch, useSelector } from "react-redux";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import { useModals } from "@/components/ConfirmationModal";
import { useCallback } from "react";
import { reportEvent } from "@/telemetry/events";
import notify from "@/utils/notify";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import extensionsSlice from "@/store/extensionsSlice";
import { traces, uninstallContextMenu } from "@/background/messenger/api";
import {
  clearDynamicElements,
  removeSidebar,
} from "@/contentScript/messenger/api";
import { thisTab } from "@/pageEditor/utils";

const { actions: extensionsActions } = extensionsSlice;

type Config = {
  extensionId: UUID;
  shouldShowConfirmation?: boolean;
};

function useRemoveExtension(): (useRemoveConfig: Config) => Promise<void> {
  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const { showConfirmation } = useModals();

  return useCallback(
    async ({ extensionId, shouldShowConfirmation = true }) => {
      console.debug(`pageEditor: remove extension with id ${extensionId}`);

      if (shouldShowConfirmation) {
        const confirm = await showConfirmation({
          title: "Remove Extension?",
          message:
            "You can reactivate extensions and blueprints from the PixieBrix Options page",
          submitCaption: "Remove",
        });

        if (!confirm) {
          return;
        }
      }

      reportEvent("PageEditorRemove", {
        sessionId,
        extensionId,
      });

      try {
        // Remove from options slice / extension storage
        dispatch(extensionsActions.removeExtension({ extensionId }));

        await Promise.allSettled([
          uninstallContextMenu({ extensionId }),
          removeSidebar(thisTab, extensionId),
          traces.clear(extensionId),
        ]);

        // Remove from page editor
        dispatch(editorActions.removeElement(extensionId));

        // Remove from the host page
        try {
          await clearDynamicElements(thisTab, {
            uuid: extensionId,
          });
        } catch (error) {
          // Element might not be on the page anymore
          console.info("Cannot clear dynamic element from page", { error });
        }
      } catch (error: unknown) {
        notify.error({
          message: "Error removing element",
          error,
        });
      }
    },
    [dispatch, sessionId, showConfirmation]
  );
}

export default useRemoveExtension;
