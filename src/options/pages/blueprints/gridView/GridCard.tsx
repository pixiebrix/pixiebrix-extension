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

import styles from "./GridCard.module.scss";

import React from "react";
import { InstallableViewItem } from "@/options/pages/blueprints/blueprintsTypes";
import { Card } from "react-bootstrap";
import SharingLabel from "@/options/pages/blueprints/SharingLabel";
import { timeSince } from "@/utils/timeUtils";
import Status from "@/options/pages/blueprints/Status";
import BlueprintActions from "@/options/pages/blueprints/BlueprintActions";

type GridCardProps = {
  installableItem: InstallableViewItem;
  style: unknown;
};

const GridCard: React.VoidFunctionComponent<GridCardProps> = ({
  installableItem,
  style,
}) => {
  const { name, updatedAt, sharing, icon } = installableItem;

  return (
    <div className={styles.root} style={style}>
      <Card className={styles.card}>
        <div className="d-flex">
          {icon}
          <h5 className="ml-2">{name}</h5>
        </div>
        <div>
          <SharingLabel sharing={sharing.source} />
          <Card.Text className="small">
            Updated: {timeSince(updatedAt)}
          </Card.Text>
          <div className={styles.actions}>
            <Status installableViewItem={installableItem} />
            <BlueprintActions installableViewItem={installableItem} />
          </div>
        </div>
      </Card>
    </div>
  );
};

export default GridCard;
