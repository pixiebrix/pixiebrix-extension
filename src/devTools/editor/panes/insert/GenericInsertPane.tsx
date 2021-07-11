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
import { getTabInfo, showBrowserActionPanel } from "@/background/devtools";
import useAvailableExtensionPoints from "@/devTools/editor/hooks/useAvailableExtensionPoints";
import Centered from "@/devTools/editor/components/Centered";
import { Button } from "react-bootstrap";
import BlockModal from "@/components/fields/BlockModal";
import { editorSlice, FormState } from "@/devTools/editor/editorSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCube, faPlus } from "@fortawesome/free-solid-svg-icons";
import { generateExtensionPointMetadata } from "@/devTools/editor/extensionPoints/base";
import { ElementConfig } from "@/devTools/editor/extensionPoints/elementConfig";
import AuthContext from "@/auth/AuthContext";
import { reportEvent } from "@/telemetry/events";
import * as nativeOperations from "@/background/devtools";

const { addElement } = editorSlice.actions;

const GenericInsertPane: React.FunctionComponent<{
  cancel: () => void;
  reservedNames: string[];
  config: ElementConfig;
}> = ({ cancel, reservedNames, config }) => {
  const dispatch = useDispatch();
  const { scope } = useContext(AuthContext);
  const { port } = useContext(DevToolsContext);

  const start = useCallback(
    async (state: FormState) => {
      dispatch(addElement(state as FormState));

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
    },
    [config, port, dispatch]
  );

  const addExisting = useCallback(
    async (extensionPoint) => {
      if (!("rawConfig" in extensionPoint)) {
        throw new Error(
          `Cannot use ${config.elementType} extension point without config in the Page Editor`
        );
      }
      const { url } = await getTabInfo(port);

      await start(
        (await config.fromExtensionPoint(
          url,
          extensionPoint.rawConfig
        )) as FormState
      );
    },
    [start, config, port]
  );

  const addNew = useCallback(async () => {
    const { url } = await getTabInfo(port);
    const metadata = await generateExtensionPointMetadata(
      config.label,
      scope,
      url,
      reservedNames
    );

    await start(
      (await config.fromNativeElement(
        url,
        metadata,
        undefined,
        []
      )) as FormState
    );
  }, [start, config, port, scope, reservedNames]);

  const extensionPoints = useAvailableExtensionPoints(config.baseClass);

  return (
    <Centered>
      <div className="PaneTitle">New {config.label}</div>
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
