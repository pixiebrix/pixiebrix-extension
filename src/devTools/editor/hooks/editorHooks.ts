/*
 * Copyright (C) 2021 PixieBrix, Inc.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public
 * License along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { IExtension } from "@/core";
import { actions, FormState } from "@/devTools/editor/editorSlice";
import { useDispatch, useSelector } from "react-redux";
import { useCallback, useContext, useMemo } from "react";
import { extensionToFormState } from "@/devTools/editor/extensionPoints/adapter";
import { reportError } from "@/telemetry/logging";
import { DevToolsContext } from "@/devTools/context";
import { useToasts } from "react-toast-notifications";
import { useFormikContext } from "formik";
import { uninstallContextMenu } from "@/background/devtools";
import * as nativeOperations from "@/background/devtools";
import { optionsSlice } from "@/options/slices";
import { useModals } from "@/components/ConfirmationModal";
import { useAsyncState } from "@/hooks/common";
import axios from "axios";
import { EditablePackage } from "@/devTools/editor/hooks/useCreate";
import { makeURL } from "@/hooks/fetch";
import { getExtensionToken } from "@/auth/token";
import { RootState } from "@/devTools/store";

const selectEditor = (x: RootState) => x.editor;

export function useReset(
  installed: IExtension[],
  element: FormState
): () => void {
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
    } catch (error) {
      reportError(error);
      dispatch(actions.adapterError({ uuid: element.uuid, error }));
    }
  }, [showConfirmation, dispatch, element.uuid, installed]);
}

export function useRemove(element: FormState): () => void {
  const { port } = useContext(DevToolsContext);
  const { addToast } = useToasts();
  const { values } = useFormikContext<FormState>();
  const dispatch = useDispatch();
  const { showConfirmation } = useModals();

  return useCallback(async () => {
    console.debug(`pageEditor: remove element ${element.uuid}`);

    const confirm = await showConfirmation({
      title: "Remove Brick?",
      message: "This action cannot be undone",
      submitCaption: "Remove",
    });

    if (!confirm) {
      return;
    }

    try {
      if (element.type === "contextMenu") {
        try {
          await uninstallContextMenu(port, { extensionId: element.uuid });
        } catch (error) {
          // The context menu may not currently be registered if it's not on a page that has a contentScript
          // with a pattern that matches
          console.info("Cannot unregister contextMenu", { error });
        }
      }
      try {
        await nativeOperations.clearDynamicElements(port, {
          uuid: element.uuid,
        });
      } catch (error) {
        // element might not be on the page anymore
        console.info("Cannot clear dynamic element from page", { error });
      }
      if (values.installed) {
        dispatch(
          optionsSlice.actions.removeExtension({
            extensionPointId: values.extensionPoint.metadata.id,
            extensionId: values.uuid,
          })
        );
      }
      dispatch(actions.removeElement(element.uuid));
    } catch (error) {
      reportError(error);
      addToast(
        `Error removing element: ${
          error.message?.toString() ?? "Unknown Error"
        }`,
        {
          appearance: "error",
          autoDismiss: true,
        }
      );
    }
  }, [showConfirmation, values, addToast, port, element, dispatch]);
}

export function useEditable(): Set<string> {
  const { knownEditable } = useSelector(selectEditor);

  const [initialEditable] = useAsyncState(async () => {
    const { data } = await axios.get<EditablePackage[]>(
      await makeURL("api/bricks/"),
      {
        headers: { Authorization: `Token ${await getExtensionToken()}` },
      }
    );
    return new Set(data.map((x) => x.name));
  }, []);

  return useMemo<Set<string>>(() => {
    // set union
    const rv = new Set<string>(initialEditable ?? new Set());
    for (const x of knownEditable) {
      rv.add(x);
    }
    return rv;
  }, [initialEditable, knownEditable]);
}
