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

import { Framework, FrameworkMeta, KNOWN_READERS } from "@/messaging/constants";
import React, { useCallback, useContext } from "react";
import { actions, EditorState } from "@/devTools/editor/editorSlice";
import { PayloadAction } from "@reduxjs/toolkit";
import { DevToolsContext } from "@/devTools/context";
import { AuthContext } from "@/auth/context";
import * as nativeOperations from "@/background/devtools";
import { getTabInfo } from "@/background/devtools";
import psl, { ParsedDomain } from "psl";
import { Button, Col, ListGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMousePointer } from "@fortawesome/free-solid-svg-icons";
import brickRegistry from "@/blocks/registry";
import { useToasts } from "react-toast-notifications";
import { reportError } from "@/telemetry/logging";

function defaultReader(frameworks: FrameworkMeta[]): Framework {
  const knownFrameworks = frameworks.filter((x) =>
    KNOWN_READERS.includes(x.id)
  );
  return knownFrameworks.length ? knownFrameworks[0].id : "jquery";
}

async function generateExtensionPointMetadata(
  scope: string,
  url: string,
  reservedNames: string[]
) {
  const urlClass = new URL(url);
  const { domain } = psl.parse(urlClass.host.split(":")[0]) as ParsedDomain;

  await brickRegistry.fetch();

  for (let index = 1; index < 1000; index++) {
    const id =
      index === 1
        ? `${scope ?? "@local"}/${domain}/action`
        : `${scope ?? "@local"}/${domain}/action-${index}`;

    if (!reservedNames.includes(id)) {
      try {
        await brickRegistry.lookup(id);
      } catch (err) {
        return {
          id,
          name: `${domain} Action`,
        };
      }
    }
  }
  throw new Error("Could not find available id");
}

function defaultMatchPattern(url: string) {
  const obj = new URL(url);
  obj.pathname = "*";
  return obj.href;
}

const Sidebar: React.FunctionComponent<
  EditorState & { dispatch: (action: PayloadAction<unknown>) => void }
> = ({ inserting, activeElement, elements, dispatch }) => {
  const { port, frameworks } = useContext(DevToolsContext);
  const { scope } = useContext(AuthContext);
  const { addToast } = useToasts();

  const toggle = useCallback(
    async (uuid: string, on: boolean) => {
      await nativeOperations.toggleElement(port, { uuid, on });
    },
    [port]
  );

  const addButton = useCallback(async () => {
    dispatch(actions.toggleInsert(true));

    try {
      const button = await nativeOperations.insertButton(port);
      const { url } = await getTabInfo(port);
      const extensionPoint = await generateExtensionPointMetadata(
        scope,
        url,
        elements.flatMap((x) => [x.extensionPoint.id, x.reader.id])
      );
      dispatch(
        actions.addElement({
          ...button,
          reader: {
            id: `${extensionPoint.id}-reader`,
            type: defaultReader(frameworks),
            selector: button.containerSelector,
            outputSchema: {},
          },
          isAvailable: {
            matchPatterns: defaultMatchPattern(url),
            selectors: null,
          },
          extensionPoint,
        })
      );
    } catch (exc) {
      reportError(exc);
      addToast(`Error adding button: ${exc.toString()}`, {
        appearance: "error",
        autoDismiss: true,
      });
    } finally {
      dispatch(actions.toggleInsert(false));
    }
  }, [port, frameworks, elements, scope]);

  return (
    <Col>
      <div>
        <Button className="mr-2" disabled={inserting} onClick={addButton}>
          Add Button <FontAwesomeIcon icon={faMousePointer} />
        </Button>
        {/*<Button disabled={inserting} onClick={addButton}>*/}
        {/*    Add Panel <FontAwesomeIcon icon={faColumns} />*/}
        {/*</Button>*/}
      </div>
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
            {x.caption}
          </ListGroup.Item>
        ))}
      </ListGroup>
      <div>Scope: {scope}</div>
    </Col>
  );
};

export default Sidebar;
