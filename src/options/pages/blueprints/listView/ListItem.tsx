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

import styles from "./ListItem.module.scss";

import React from "react";
import SharingLabel from "@/options/pages/blueprints/SharingLabel";
import BlueprintActions from "@/options/pages/blueprints/BlueprintActions";
import { timeSince } from "@/utils/timeUtils";
import { InstallableViewItem } from "@/options/pages/blueprints/blueprintsTypes";
import Status from "@/options/pages/blueprints/Status";
import { ListGroup } from "react-bootstrap";

const ListItem: React.VoidFunctionComponent<{
  installableItem: InstallableViewItem;
  style: React.CSSProperties;
}> = ({ installableItem, style }) => {
  const { name, sharing, updatedAt, icon } = installableItem;

  return (
    <ListGroup.Item className={styles.root} style={style}>
      <div className={styles.icon}>{icon}</div>
      <div className={styles.name}>
        <h5>{name}</h5>
      </div>
      <div className="flex-shrink-0">
        <div className={styles.sharing}>
          <span className={styles.updatedAt}>
            Updated: {timeSince(updatedAt)}
          </span>
          <SharingLabel sharing={sharing.source} />
        </div>
      </div>
      <div className={styles.status}>
        <Status installableViewItem={installableItem} />
      </div>
      <div className="flex-shrink-0">
        <BlueprintActions installableViewItem={installableItem} />
      </div>
    </ListGroup.Item>
  );
};

export default React.memo(ListItem);
