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
import SharingLabel from "@/options/pages/blueprints/labels/SharingLabel";
import Status from "@/options/pages/blueprints/Status";
import BlueprintActions from "@/options/pages/blueprints/BlueprintActions";
import LastUpdatedLabel from "@/options/pages/blueprints/labels/LastUpdatedLabel";

type GridCardProps = {
  installableItem: InstallableViewItem;
};

const GridCard: React.VoidFunctionComponent<GridCardProps> = ({
  installableItem,
}) => {
  const { name, updatedAt, sharing, icon, description } = installableItem;

  return (
    <div className={styles.root}>
      <Card className={styles.card}>
        <Card.Body className={styles.cardBody}>
          <div className={styles.primaryInfo}>
            <div className="d-flex justify-content-between">
              <div>
                <h5 className={styles.name}>{name}</h5>
                <span className={styles.description}>{description}</span>
              </div>
              <span className="mb-2">{icon}</span>
            </div>
          </div>
          <div>
            <div className={styles.actions}>
              <Status {...installableItem} />
              <BlueprintActions installableViewItem={installableItem} />
            </div>
          </div>
        </Card.Body>
        <Card.Footer className={styles.cardFooter}>
          <span className={styles.sharing}>
            <SharingLabel
              sharing={sharing.source}
              className={styles.sharingLabel}
            />
          </span>
          <LastUpdatedLabel
            timestamp={updatedAt}
            className={styles.updatedAt}
          />
        </Card.Footer>
      </Card>
    </div>
  );
};

export default React.memo(GridCard);
