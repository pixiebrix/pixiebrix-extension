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
import cx from "classnames";

type GridCardProps = {
  installableItem: InstallableViewItem;
};

const GridCard: React.VoidFunctionComponent<GridCardProps> = ({
  installableItem,
}) => {
  const {
    name,
    updatedAt,
    description,
    sharing,
    installable,
  } = installableItem;

  return (
    <Card className={styles.root}>
      <div>
        <h5>{name}</h5>
        <p className={cx(styles.description, "text-muted")}>{description}</p>
      </div>
      <div>
        {sharing.packageId ? (
          <code className="p-0">{sharing.packageId}</code>
        ) : (
          <SharingLabel installable={installable} />
        )}
        <Card.Text>Updated: {timeSince(updatedAt)}</Card.Text>
        <div className={styles.actions}>
          <Status installable={installable} />
          <BlueprintActions installable={installable} />
        </div>
      </div>
    </Card>
  );
};

export default GridCard;
