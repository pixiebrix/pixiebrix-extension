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

import React from "react";
import config from "@/pageEditor/extensionPoints/menuItem";
import useAvailableExtensionPoints from "@/pageEditor/hooks/useAvailableExtensionPoints";
import {
  MenuDefinition,
  MenuItemExtensionPoint,
} from "@/extensionPoints/menuItemExtension";
import Centered from "@/pageEditor/components/Centered";
import { Alert, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faInfo,
  faMousePointer,
  faSearch,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";
import BrickModal from "@/components/brickModalNoTags/BrickModal";
import { ExtensionPointConfig } from "@/extensionPoints/types";
import useAddExisting from "@/pageEditor/panes/insert/useAddExisting";

type MenuItemWithConfig = MenuItemExtensionPoint & {
  rawConfig: ExtensionPointConfig<MenuDefinition>;
};

const InsertMenuItemPane: React.FunctionComponent<{ cancel: () => void }> = ({
  cancel,
}) => {
  const menuItemExtensionPoints = useAvailableExtensionPoints(
    MenuItemExtensionPoint
  );

  const addExisting = useAddExisting(config, cancel);

  return (
    <Centered isScrollable>
      <div className={styles.title}>Inserting Button/Menu Item</div>

      <div className="text-left">
        <p>
          <FontAwesomeIcon icon={faMousePointer} size="lg" /> Click on an
          existing <code>button</code> or button-like element to add a button to
          that button&apos;s group. You can also select a menu item or nav link.
        </p>

        <div>
          <Alert variant="info">
            <FontAwesomeIcon icon={faInfo} /> <b>Tip:</b> to increase the
            accuracy of detection, you can Shift+Click one or more buttons in
            the button group. Click a button without holding Shift to complete
            placement.
          </Alert>
        </div>
      </div>
      <div>
        <BrickModal
          bricks={menuItemExtensionPoints ?? []}
          caption="Select button foundation"
          renderButton={(onClick) => (
            <Button
              variant="info"
              onClick={onClick}
              disabled={!menuItemExtensionPoints?.length}
            >
              <FontAwesomeIcon icon={faSearch} /> Search Marketplace
            </Button>
          )}
          onSelect={async (block) => addExisting(block as MenuItemWithConfig)}
        />

        <Button variant="danger" className="ml-2" onClick={cancel}>
          <FontAwesomeIcon icon={faTimes} /> Cancel
        </Button>
      </div>
    </Centered>
  );
};

export default InsertMenuItemPane;
