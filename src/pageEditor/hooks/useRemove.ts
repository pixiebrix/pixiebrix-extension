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
import { useCallback } from "react";
import notify from "@/utils/notify";
import { useFormikContext } from "formik";
import { useDispatch, useSelector } from "react-redux";
import { useModals } from "@/components/ConfirmationModal";
import { uninstallContextMenu } from "@/background/messenger/api";
import { thisTab } from "@/pageEditor/utils";
import {
  clearDynamicElements,
  removeSidebar,
} from "@/contentScript/messenger/api";
import extensionsSlice from "@/store/extensionsSlice";
import { selectSessionId } from "@/pageEditor/slices/sessionSelectors";
import { reportEvent } from "@/telemetry/events";
import { FormState } from "@/pageEditor/pageEditorTypes";

/**
 * Remove the current element from the page and installed extensions
 * @param element the current Page Editor state
 */
function useRemove(element: FormState): () => void {
  const { values } = useFormikContext<FormState>();
  const dispatch = useDispatch();
  const sessionId = useSelector(selectSessionId);
  const { showConfirmation } = useModals();

  return useCallback(async () => {
    console.debug(`pageEditor: remove element ${element.uuid}`);

    const confirm = await showConfirmation({
      title: "Remove Extension?",
      message:
        "You can reactivate extensions and blueprints from the PixieBrix Options page",
      submitCaption: "Remove",
    });

    if (!confirm) {
      return;
    }

    const ref = {
      extensionPointId: values.extensionPoint.metadata.id,
      extensionId: values.uuid,
    };

    reportEvent("PageEditorRemove", {
      sessionId,
      extensionId: values.uuid,
    });

    try {
      // Remove from storage first so it doesn't get re-added by any subsequent steps
      if (values.installed) {
        dispatch(extensionsSlice.actions.removeExtension(ref));
      }

      await Promise.allSettled([
        uninstallContextMenu(ref),
        removeSidebar(thisTab, ref.extensionId),
      ]);

      // Remove from page editor
      dispatch(actions.removeElement(element.uuid));

      // Remove from the host page
      try {
        await clearDynamicElements(thisTab, {
          uuid: element.uuid,
        });
      } catch (error) {
        // Element might not be on the page anymore
        console.info("Cannot clear dynamic element from page", { error });
      }
    } catch (error) {
      notify.error({
        message: "Error removing element",
        error,
      });
    }
  }, [showConfirmation, sessionId, values, element, dispatch]);
}

export default useRemove;
