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

import React, { useState } from "react";
import { InstallableViewItem } from "@/options/pages/blueprints/blueprintsTypes";
import { Card, OverlayTrigger, Popover } from "react-bootstrap";
import SharingLabel from "@/options/pages/blueprints/SharingLabel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Status from "@/options/pages/blueprints/Status";
import BlueprintActions from "@/options/pages/blueprints/BlueprintActions";
import { faClock } from "@fortawesome/free-regular-svg-icons";
import { timeSince } from "@/utils/timeUtils";
import { faRedo, faSave, faUndo } from "@fortawesome/free-solid-svg-icons";

type GridCardProps = {
  installableItem: InstallableViewItem;
};

const GridCard: React.VoidFunctionComponent<GridCardProps> = ({
  installableItem,
}) => {
  const [hovering, setHovering] = useState(false);
  const { name, updatedAt, sharing, icon, description } = installableItem;
  const updatedAtFormatted = new Date(updatedAt).toLocaleString();

  return (
    <div
      className={styles.root}
      onMouseEnter={() => {
        setHovering(true);
      }}
      onMouseLeave={() => {
        setHovering(false);
      }}
    >
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
              <Status
                installableViewItem={installableItem}
                showActionButton={true}
              />
              <BlueprintActions installableViewItem={installableItem} />
            </div>
          </div>
        </Card.Body>
        <Card.Footer className={styles.cardFooter}>
          <OverlayTrigger
            trigger="hover"
            key="updateAt"
            placement="top"
            delay={700}
            overlay={
              <Popover id="sharingLabelPopover">
                <Popover.Content>
                  {sharing.source.type === "Personal" &&
                    "You created this blueprint."}
                  {sharing.source.type === "Team" &&
                    `This blueprint was shared with you by "${sharing.source.label}" team.`}
                  {sharing.source.type === "Public" &&
                    "You activated this blueprint from the public marketplace."}
                </Popover.Content>
              </Popover>
            }
          >
            <span className={styles.sharingLabel}>
              <SharingLabel sharing={sharing.source} />
            </span>
          </OverlayTrigger>
          <OverlayTrigger
            trigger="hover"
            key="updateAt"
            placement="top"
            delay={700}
            overlay={
              <Popover id={"updatedAtPopover"}>
                <Popover.Content>
                  Last updated {updatedAtFormatted}
                </Popover.Content>
              </Popover>
            }
          >
            <span className={styles.updatedAt}>
              <FontAwesomeIcon icon={faClock} /> {timeSince(updatedAtFormatted)}
            </span>
          </OverlayTrigger>
        </Card.Footer>
      </Card>
    </div>
  );
};

export default React.memo(GridCard);
