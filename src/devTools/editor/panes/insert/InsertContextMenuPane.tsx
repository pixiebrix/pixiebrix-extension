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
import { getTabInfo } from "@/background/devtools";
import useAvailableExtensionPoints from "@/devTools/editor/hooks/useAvailableExtensionPoints";
import Centered from "@/devTools/editor/components/Centered";
import { Button } from "react-bootstrap";
import BlockModal from "@/components/fields/BlockModal";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import { editorSlice } from "@/devTools/editor/editorSlice";
import {
  ContextMenuExtensionPoint,
  MenuDefinition,
} from "@/extensionPoints/contextMenu";
import { makeContextMenuExtensionFormState } from "@/devTools/editor/extensionPoints/contextMenu";

const { addElement } = editorSlice.actions;

type MenuItemWithConfig = ContextMenuExtensionPoint & {
  rawConfig: ExtensionPointConfig<MenuDefinition>;
};

const InsertContextMenuPane: React.FunctionComponent<{
  cancel: () => void;
}> = ({ cancel }) => {
  const dispatch = useDispatch();
  const { port } = useContext(DevToolsContext);

  const addExistingButton = useCallback(
    async (extensionPoint: MenuItemWithConfig) => {
      cancel();
      if (!("rawConfig" in extensionPoint)) {
        throw new Error(
          "Cannot use contextMenu extension point without config in the Page Editor"
        );
      }
      const { url } = await getTabInfo(port);
      const state = await makeContextMenuExtensionFormState(
        url,
        extensionPoint.rawConfig
      );
      dispatch(addElement(state));
    },
    [port, dispatch, cancel]
  );

  const extensionPoints = useAvailableExtensionPoints(
    ContextMenuExtensionPoint
  );

  return (
    <Centered>
      <div className="PaneTitle">Add context menu item</div>

      <div className="text-left">
        <p>
          A context menu item (also called a right-click menu) appears when you
          right click on a page, text selection, or other content.
        </p>

        <p>
          You can use an existing foundation for your new context menu, or start
          from scratch to have full control over where the the menu item appears
        </p>
      </div>
      <div>
        <BlockModal
          blocks={extensionPoints ?? []}
          caption="Select context menu foundation"
          renderButton={({ show }) => (
            <Button
              variant="info"
              onClick={show}
              disabled={!extensionPoints?.length}
            >
              Use Existing Foundation
            </Button>
          )}
          onSelect={async (block) =>
            addExistingButton(block as MenuItemWithConfig)
          }
        />

        <Button variant="danger" className="ml-2" onClick={cancel}>
          Cancel Insert
        </Button>
      </div>
    </Centered>
  );
};

export default InsertContextMenuPane;
