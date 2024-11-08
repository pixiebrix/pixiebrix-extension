/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import { type ModViewItem } from "../../../../types/modTypes";
import { Card } from "react-bootstrap";
import SharingLabel from "../labels/SharingLabel";
import Status from "../Status";
import ModsPageActions from "../ModsPageActions";
import LastUpdatedLabel from "../labels/LastUpdatedLabel";
import {
  faCubes,
  faExclamationCircle,
} from "@fortawesome/free-solid-svg-icons";
import MarketplaceListingIcon from "@/components/MarketplaceListingIcon";

type GridCardProps = {
  modViewItem: ModViewItem;
};

const GridCard: React.VoidFunctionComponent<GridCardProps> = ({
  modViewItem,
}) => {
  const { modId, name, updatedAt, sharingSource, description, isUnavailable } =
    modViewItem;

  return (
    <div className={styles.root}>
      <Card className={styles.card}>
        <Card.Body className={styles.cardBody}>
          <div className={styles.primaryInfo}>
            <div>
              <h5 className={styles.name}>{name}</h5>
              <span className={styles.description}>{description}</span>
              <div className={styles.packageId}>{modId}</div>
            </div>
            <span className="mb-2">
              <MarketplaceListingIcon
                packageId={modId}
                defaultIcon={isUnavailable ? faExclamationCircle : faCubes}
                size="2x"
              />
            </span>
          </div>
          <div>
            <div className={styles.actions}>
              <Status modViewItem={modViewItem} />
              <ModsPageActions modViewItem={modViewItem} />
            </div>
          </div>
        </Card.Body>
        <Card.Footer className={styles.cardFooter}>
          <span className={styles.sharing}>
            <SharingLabel
              sharing={sharingSource}
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
