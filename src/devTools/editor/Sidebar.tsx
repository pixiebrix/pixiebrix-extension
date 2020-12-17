/*
 * Copyright (C) 2020 Pixie Brix, LLC
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import React, { useCallback, useContext } from "react";
import { actions, EditorState } from "@/devTools/editor/editorSlice";
import { PayloadAction } from "@reduxjs/toolkit";
import { DevToolsContext } from "@/devTools/context";
import { AuthContext } from "@/auth/context";
import * as nativeOperations from "@/background/devtools";
import { getTabInfo } from "@/background/devtools";
import { Button, ListGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBolt,
  faColumns,
  faMousePointer,
} from "@fortawesome/free-solid-svg-icons";
import { useToasts } from "react-toast-notifications";
import { reportError } from "@/telemetry/logging";
import { generateExtensionPointMetadata } from "@/devTools/editor/extensionPoints/base";
import {
  makePanelConfig,
  makePanelState,
} from "@/devTools/editor/extensionPoints/panel";
import {
  makeActionConfig,
  makeActionState,
} from "@/devTools/editor/extensionPoints/menuItem";
import {
  makeTriggerConfig,
  makeTriggerState,
} from "@/devTools/editor/extensionPoints/trigger";

const Sidebar: React.FunctionComponent<
  EditorState & { dispatch: (action: PayloadAction<unknown>) => void }
> = ({ inserting, activeElement, elements, dispatch }) => {
  const { port, frameworks } = useContext(DevToolsContext);
  const { scope } = useContext(AuthContext);
  const { addToast } = useToasts();

  const toggle = useCallback(
    async (uuid: string, on: boolean) => {
      await nativeOperations.toggleOverlay(port, { uuid, on });
    },
    [port]
  );

  const addButton = useCallback(async () => {
    dispatch(actions.toggleInsert(true));

    try {
      const button = await nativeOperations.insertButton(port);
      const { url } = await getTabInfo(port);
      const metadata = await generateExtensionPointMetadata(
        "Action",
        scope,
        url,
        elements.flatMap((x) => [
          x.extensionPoint.metadata.id,
          x.reader.metadata.id,
        ])
      );
      const initialState = makeActionState(url, metadata, button, frameworks);
      await nativeOperations.updateDynamicElement(
        port,
        makeActionConfig(initialState)
      );
      dispatch(actions.addElement(initialState));
    } catch (exc) {
      reportError(exc);
      addToast(`Error adding button: ${exc.toString()}`, {
        appearance: "error",
        autoDismiss: true,
      });
    } finally {
      dispatch(actions.toggleInsert(false));
    }
  }, [port, frameworks, elements, scope, addToast]);

  const addPanel = useCallback(async () => {
    dispatch(actions.toggleInsert(true));
    try {
      const panel = await nativeOperations.insertPanel(port);
      const { url } = await getTabInfo(port);
      const metadata = await generateExtensionPointMetadata(
        "Panel",
        scope,
        url,
        elements.flatMap((x) => [
          x.extensionPoint.metadata.id,
          x.reader.metadata.id,
        ])
      );
      const initialState = makePanelState(url, metadata, panel, frameworks);
      await nativeOperations.updateDynamicElement(
        port,
        makePanelConfig(initialState)
      );
      dispatch(actions.addElement(initialState));
    } catch (exc) {
      reportError(exc);
      addToast(`Error adding panel: ${exc.toString()}`, {
        appearance: "error",
        autoDismiss: true,
      });
    } finally {
      dispatch(actions.toggleInsert(false));
    }
  }, [port, frameworks, elements, scope, addToast]);

  const addTrigger = useCallback(async () => {
    dispatch(actions.toggleInsert(true));
    try {
      const { url } = await getTabInfo(port);
      const metadata = await generateExtensionPointMetadata(
        "Trigger",
        scope,
        url,
        elements.flatMap((x) => [
          x.extensionPoint.metadata.id,
          x.reader.metadata.id,
        ])
      );
      const initialState = makeTriggerState(url, metadata, frameworks);
      await nativeOperations.updateDynamicElement(
        port,
        makeTriggerConfig(initialState)
      );
      dispatch(actions.addElement(initialState));
    } catch (exc) {
      reportError(exc);
      addToast(`Error adding trigger: ${exc.toString()}`, {
        appearance: "error",
        autoDismiss: true,
      });
    } finally {
      dispatch(actions.toggleInsert(false));
    }
  }, [port, frameworks, elements, scope, addToast]);

  return (
    <div className="Sidebar d-flex flex-column">
      <div className="Sidebar__actions d-inline-flex flex-wrap">
        <Button
          className="flex-grow-1"
          size="sm"
          variant="info"
          disabled={inserting}
          onClick={addButton}
        >
          Button <FontAwesomeIcon icon={faMousePointer} />
        </Button>
        <Button
          className="flex-grow-1"
          size="sm"
          disabled={inserting}
          variant="info"
          onClick={addPanel}
        >
          Panel <FontAwesomeIcon icon={faColumns} />
        </Button>
        <Button
          className="flex-grow-1"
          size="sm"
          disabled={inserting}
          onClick={addTrigger}
          variant="info"
        >
          Trigger <FontAwesomeIcon icon={faBolt} />
        </Button>
      </div>
      <div className="flex-grow-1 overflow-y-auto">
        <ListGroup>
          {elements.map((x) => (
            <ListGroup.Item
              active={x.uuid == activeElement}
              key={x.uuid}
              onMouseEnter={() => toggle(x.uuid, true)}
              onMouseLeave={() => toggle(x.uuid, false)}
              onClick={() => dispatch(actions.selectElement(x.uuid))}
              style={{ cursor: "pointer" }}
            >
              {x.extensionPoint.metadata.name}
            </ListGroup.Item>
          ))}
        </ListGroup>
      </div>
      <div className="Sidebar__footer">
        <span>
          Scope: <code>{scope}</code>
        </span>
      </div>
    </div>
  );
};

export default Sidebar;
