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

// eslint-disable-next-line unicorn/prevent-abbreviations -- Mod is not short for anything (maybe add this word to dictionary?)
export const ActiveModListItem: React.FunctionComponent<{
  installableItem: InstallableViewItem;
}> = ({ installableItem }) => {
  const { name, icon } = installableItem;
  const { requestPermissions } = useInstallableViewItemActions(installableItem);

  return (
    <ListGroup.Item className={styles.root}>
      <div className={styles.mainContent}>
        <div className={styles.icon}>{icon}</div>
        <div>
          <div>
            <h5 className={styles.modName}>{name}</h5>
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
