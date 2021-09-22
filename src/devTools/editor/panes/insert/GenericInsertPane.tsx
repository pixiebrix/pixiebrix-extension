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

import React, { useCallback, useContext } from "react";
import { useDispatch } from "react-redux";
import { DevToolsContext } from "@/devTools/context";
import { showBrowserActionPanel } from "@/background/devtools";
import useAvailableExtensionPoints from "@/devTools/editor/hooks/useAvailableExtensionPoints";
import Centered from "@/devTools/editor/components/Centered";
import { Button } from "react-bootstrap";
import BlockModal from "@/components/fields/BlockModal";
import { editorSlice, FormState } from "@/devTools/editor/slices/editorSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCube, faPlus } from "@fortawesome/free-solid-svg-icons";
import { internalExtensionPointMetaFactory } from "@/devTools/editor/extensionPoints/base";
import { ElementConfig } from "@/devTools/editor/extensionPoints/elementConfig";
import { reportEvent } from "@/telemetry/events";
import * as nativeOperations from "@/background/devtools";
import { useToasts } from "react-toast-notifications";
import { reportError } from "@/telemetry/logging";
import { getCurrentURL } from "@/devTools/utils";

const { addElement } = editorSlice.actions;

const GenericInsertPane: React.FunctionComponent<{
  cancel: () => void;
  config: ElementConfig;
}> = ({ cancel, config }) => {
  const dispatch = useDispatch();
  const { addToast } = useToasts();
  const { port } = useContext(DevToolsContext);

  const start = useCallback(
    async (state: FormState) => {
      try {
        dispatch(addElement(state));

        await nativeOperations.updateDynamicElement(
          port,
          config.asDynamicElement(state)
        );

        // TODO: report if created new, or using existing foundation
        reportEvent("PageEditorStart", {
          type: config.elementType,
        });

        if (config.elementType === "actionPanel") {
          // For convenience, open the side panel if it's not already open so that the user doesn't
          // have to manually toggle it
          void showBrowserActionPanel(port);
        }
      } catch (error: unknown) {
        reportError(error);
        addToast("Error adding element", {
          autoDismiss: true,
          appearance: "error",
        });
      }
    },
    [config, port, dispatch, addToast]
  );

  const addExisting = useCallback(
    async (extensionPoint) => {
      try {
        const url = await getCurrentURL();
        await start(
          (await config.fromExtensionPoint(
            url,
            extensionPoint.rawConfig
          )) as FormState
        );
      } catch (error: unknown) {
        reportError(error);
        addToast("Error using existing foundation", {
          autoDismiss: true,
          appearance: "error",
        });
      }
    },
    [start, config, addToast]
  );

  const addNew = useCallback(async () => {
    try {
      const url = await getCurrentURL();

      const metadata = internalExtensionPointMetaFactory();

      await start(
        config.fromNativeElement(url, metadata, undefined, []) as FormState
      );
    } catch (error: unknown) {
      reportError(error);
      addToast("Error using adding new element", {
        autoDismiss: true,
        appearance: "error",
      });
    }
  }, [start, config, addToast]);

  const extensionPoints = useAvailableExtensionPoints(config.baseClass);

  return (
    <Centered isScrollable>
      <div className="PaneTitle">Add {config.label}</div>
      <div className="text-left">{config.insertModeHelp}</div>
      <div>
        <BlockModal
          blocks={extensionPoints ?? []}
          caption={`Select ${config.label} Foundation`}
          renderButton={({ show }) => (
            <Button
              variant="info"
              onClick={show}
              disabled={!extensionPoints?.length}
            >
              <FontAwesomeIcon icon={faCube} /> Use Existing {config.label}
            </Button>
          )}
          onSelect={async (block) => addExisting(block)}
        />

        <Button variant="info" className="ml-2" onClick={addNew}>
          <FontAwesomeIcon icon={faPlus} /> Create New
        </Button>

        <Button variant="danger" className="ml-2" onClick={cancel}>
          Cancel Insert
        </Button>
      </div>
    </Centered>
  );
};

export default GenericInsertPane;
