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

import styles from "@/pageEditor/panes/Pane.module.scss";

import {
  PanelDefinition,
  PanelExtensionPoint,
} from "@/extensionPoints/panelExtension";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import React from "react";
import useAvailableExtensionPoints from "@/pageEditor/hooks/useAvailableExtensionPoints";
import Centered from "@/pageEditor/components/Centered";
import BrickModal from "@/components/brickModalNoTags/BrickModal";
import { Alert, Button } from "react-bootstrap";
import config from "@/pageEditor/extensionPoints/panel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faExclamationTriangle,
  faMousePointer,
  faSearch,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import useAddExisting from "@/pageEditor/panes/insert/useAddExisting";
import useFlags from "@/hooks/useFlags";

type PanelWithConfig = PanelExtensionPoint & {
  rawConfig: ExtensionPointConfig<PanelDefinition>;
};

const InsertPanelPane: React.FunctionComponent<{
  cancel: () => void;
}> = ({ cancel }) => {
  const panelExtensionPoints = useAvailableExtensionPoints(PanelExtensionPoint);
  const addExistingPanel = useAddExisting(config, cancel);

  const { flagOn } = useFlags();

  return (
    <Centered isScrollable>
      <div className={styles.title}>Inserting Panel</div>

      <div className="text-left">
        <p>
          <FontAwesomeIcon icon={faMousePointer} size="lg" /> Click on an
          existing <code>div</code> or container-like element to insert a panel
          in that container. You may also search the{" "}
          <span className="text-info">Marketplace</span> for existing panels.
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
        {flagOn("page-editor-extension-point-marketplace") && (
          <BrickModal
            bricks={panelExtensionPoints ?? []}
            caption="Select panel foundation"
            renderButton={(onClick) => (
              <Button
                variant="info"
                onClick={onClick}
                disabled={!panelExtensionPoints?.length}
              >
                <FontAwesomeIcon icon={faSearch} /> Search Marketplace
              </Button>
            )}
            onSelect={async (block) =>
              addExistingPanel(block as PanelWithConfig)
            }
          />
        )}

        <Button className="ml-2" variant="danger" onClick={cancel}>
          <FontAwesomeIcon icon={faTimes} /> Cancel
        </Button>
      </div>
    </Centered>
  );
};

export default InsertPanelPane;
