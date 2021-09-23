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

import {
  PanelDefinition,
  PanelExtensionPoint,
} from "@/extensionPoints/panelExtension";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import React from "react";
import useAvailableExtensionPoints from "@/devTools/editor/hooks/useAvailableExtensionPoints";
import Centered from "@/devTools/editor/components/Centered";
import BlockModal from "@/components/brickModal/BrickModal";
import { Alert, Button } from "react-bootstrap";
import config from "@/devTools/editor/extensionPoints/panel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCube,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import useAddExisting from "@/devTools/editor/panes/insert/useAddExisting";

type PanelWithConfig = PanelExtensionPoint & {
  rawConfig: ExtensionPointConfig<PanelDefinition>;
};

const InsertPanelPane: React.FunctionComponent<{
  cancel: () => void;
}> = ({ cancel }) => {
  const panelExtensionPoints = useAvailableExtensionPoints(PanelExtensionPoint);
  const addExistingPanel = useAddExisting(config, cancel);

  return (
    <Centered isScrollable>
      <div className="PaneTitle">Inserting Panel</div>

      <div className="text-left">
        <p>
          Click on a container to insert a panel in that container. Or, click{" "}
          <span className="text-info">Use Existing Panel</span> to use a panel
          foundation that already exists for the page
        </p>

        <div>
          <Alert variant="warning">
            <FontAwesomeIcon icon={faExclamationTriangle} /> Automatic panel
            placement is currently in <b>Alpha</b> and typically requires manual
            configuration/adjustment
          </Alert>
        </div>
      </div>
      <div>
        <BlockModal
          bricks={panelExtensionPoints ?? []}
          caption="Select panel foundation"
          renderButton={({ show }) => (
            <Button
              variant="info"
              onClick={show}
              disabled={!panelExtensionPoints?.length}
            >
              <FontAwesomeIcon icon={faCube} /> Use Existing Panel
            </Button>
          )}
          onSelect={async (block) => addExistingPanel(block as PanelWithConfig)}
        />

        <Button className="ml-2" variant="danger" onClick={cancel}>
          Cancel Insert
        </Button>
      </div>
    </Centered>
  );
};

export default InsertPanelPane;
