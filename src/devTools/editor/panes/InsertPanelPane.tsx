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

import { editorSlice } from "@/devTools/editor/editorSlice";
import {
  PanelDefinition,
  PanelExtensionPoint,
} from "@/extensionPoints/panelExtension";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import React, { useCallback, useContext } from "react";
import { useDispatch } from "react-redux";
import { DevToolsContext } from "@/devTools/context";
import useAvailableExtensionPoints from "@/devTools/editor/hooks/useAvailableExtensionPoints";
import { getTabInfo } from "@/background/devtools";
import { makePanelExtensionFormState } from "@/devTools/editor/extensionPoints/panel";
import Centered from "@/devTools/editor/components/Centered";
import BlockModal from "@/components/fields/BlockModal";
import { Button } from "react-bootstrap";

const { addElement } = editorSlice.actions;

type PanelWithConfig = PanelExtensionPoint & {
  rawConfig: ExtensionPointConfig<PanelDefinition>;
};

const InsertPanelPane: React.FunctionComponent<{
  cancel: () => void;
}> = ({ cancel }) => {
  const dispatch = useDispatch();
  const { port } = useContext(DevToolsContext);

  const panelExtensionPoints = useAvailableExtensionPoints(PanelExtensionPoint);

  const addExistingPanel = useCallback(
    async (extensionPoint: PanelWithConfig) => {
      cancel();
      if (!("rawConfig" in extensionPoint)) {
        throw new Error(
          "Cannot use panel extension point without config in the Page Editor"
        );
      }
      const { url } = await getTabInfo(port);
      const state = await makePanelExtensionFormState(
        url,
        extensionPoint.rawConfig
      );
      dispatch(addElement(state));
    },
    [port, dispatch, cancel]
  );

  return (
    <Centered>
      <div className="PaneTitle">Inserting panel</div>

      <div className="text-left">
        <p>Click on a container to insert a panel in that container.</p>
      </div>
      <div>
        <BlockModal
          blocks={panelExtensionPoints ?? []}
          caption="Select panel foundation"
          renderButton={({ show }) => (
            <Button
              variant="info"
              onClick={show}
              disabled={!panelExtensionPoints?.length}
            >
              Add Existing Panel
            </Button>
          )}
          onSelect={(block) => addExistingPanel(block as PanelWithConfig)}
        />

        <Button className="ml-2" variant="danger" onClick={cancel}>
          Cancel Insert
        </Button>
      </div>
    </Centered>
  );
};

export default InsertPanelPane;
