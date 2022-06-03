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

import React from "react";
import { IBrick } from "@/core";
import { Button, Card, ListGroup } from "react-bootstrap";
import BrickIcon from "@/components/BrickIcon";
import styles from "./BrickResult.module.scss";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const BRICK_RESULT_FIXED_HEIGHT_PX = 98;

export type BrickResultProps = {
  brick: IBrick;
  onSelect: () => void;
  onShowDetail: () => void;
};

const BrickResult: React.FunctionComponent<BrickResultProps> = ({
  brick,
  onSelect,
  onShowDetail,
}) => (
  <ListGroup.Item onClick={onShowDetail} className={styles.root}>
    <Card className={styles.card}>
      {/* Main Content */}
      <div className={styles.cardContent}>
        <div className={styles.nameRow}>
          <BrickIcon brick={brick} faIconClass={styles.icon} />
          <span className={styles.name}>{brick.name}</span>
        </div>
        {brick.description ? (
          <div className={styles.description}>{brick.description}</div>
        ) : (
          <small className="text-muted font-italic">
            No description provided.
          </small>
        )}
      </div>

      {/* Hover Actions */}
      <div className={styles.actions}>
        <span className={styles.viewDetails}>View Details</span>
        <Button
          variant="primary"
          onClick={() => {
            onSelect();
          }}
          className={styles.addButton}
        >
          <FontAwesomeIcon icon={faPlus} /> Add
        </Button>
      </div>
    </Card>
  </ListGroup.Item>
);

export default BrickResult;
