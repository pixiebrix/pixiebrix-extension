/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

// eslint-disable-next-line unicorn/prevent-abbreviations -- Mod is not short for anything (maybe add this word to dictionary?)
import styles from "@/sidebar/homePanel/ActiveModListItem.module.scss";

import React from "react";
import { type InstallableViewItem } from "@/extensionConsole/pages/blueprints/blueprintsTypes";
import useInstallableViewItemActions from "@/extensionConsole/pages/blueprints/useInstallableViewItemActions";
import { Button, ListGroup } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import BlueprintActions from "@/extensionConsole/pages/blueprints/BlueprintActions";
import {
  isBlueprint,
  isUnavailableRecipe,
} from "@/extensionConsole/pages/blueprints/utils/installableUtils";
import extensionPointRegistry from "@/extensionPoints/registry";
import { type ExtensionPointType } from "@/extensionPoints/types";
import useAsyncState from "@/hooks/useAsyncState";

const ExtensionPointTypeMap: Record<ExtensionPointType, string> = {
  panel: "Sidebar Panel",
  menuItem: "Button",
  trigger: "Trigger",
  contextMenu: "Context Menu",
  actionPanel: "Sidebar",
  quickBar: "Quick Bar Action",
  quickBarProvider: "Dynamic Quick Bar",
  tour: "Tour",
};

const getStarterBricksContained = async (
  installableItem: InstallableViewItem
): Promise<ExtensionPointType[]> => {
  const starterBricksContained = new Set<ExtensionPointType>();
  if (isUnavailableRecipe(installableItem.installable)) {
    // TODO: Figure out what to display here
    return [...starterBricksContained];
  }

  if (isBlueprint(installableItem.installable)) {
    for (const extensionPoint of Object.values(
      installableItem.installable.definitions
    )) {
      starterBricksContained.add(extensionPoint.definition.type);
    }

    console.log(
      "*** returning blueprint starter bricks",
      starterBricksContained
    );
    return [...starterBricksContained];
  }

  const starterBrickType = await extensionPointRegistry.lookup(
    installableItem.installable.extensionPointId
  );
  starterBricksContained.add(starterBrickType._definition.type);
  console.log("*** returning extension starter bricks", starterBricksContained);
  return [...starterBricksContained];
};

// eslint-disable-next-line unicorn/prevent-abbreviations -- Mod is not short for anything (maybe add this word to dictionary?)
export const ActiveModListItem: React.FunctionComponent<{
  installableItem: InstallableViewItem;
}> = ({ installableItem }) => {
  const { name, icon } = installableItem;
  const { requestPermissions } = useInstallableViewItemActions(installableItem);

  const { data: starterBricksContained } = useAsyncState(
    async () => {
      return getStarterBricksContained(installableItem);
    },
    [],
    { initialValue: [] }
  );

  console.log("*** starterBricksCotnained", starterBricksContained);

  return (
    <ListGroup.Item className={styles.root}>
      <div className={styles.mainContent}>
        <div className={styles.icon}>{icon}</div>
        <div>
          <div>
            <h5 className={styles.modName}>{name}</h5>
            <span className={styles.starterBricksList}>
              {starterBricksContained
                .map(
                  (starterBrickType) =>
                    // eslint-disable-next-line security/detect-object-injection -- starterBrickType is an ExtensionPointType
                    ExtensionPointTypeMap[starterBrickType]
                )
                .join(" • ")}
            </span>
          </div>
          {requestPermissions && (
            <Button
              variant="link"
              size="sm"
              className={styles.warningLink}
              onClick={requestPermissions}
            >
              <FontAwesomeIcon icon={faExclamationCircle} /> Grant Permissions
            </Button>
          )}
        </div>
      </div>
      <div className="flex-shrink-1">
        <BlueprintActions installableViewItem={installableItem} />
      </div>
    </ListGroup.Item>
  );
};

export default ActiveModListItem;
