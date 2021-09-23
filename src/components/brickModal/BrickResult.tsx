/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { ListGroup } from "react-bootstrap";
import cx from "classnames";
import styles from "@/options/pages/brickEditor/referenceTab/BlockResult.module.scss";
import BrickIcon from "@/components/BrickIcon";
import { truncate } from "lodash";
import { OfficialBadge } from "@/components/OfficialBadge";

const BrickResult: React.FunctionComponent<{
  brick: IBrick;
  onSelect: () => void;
}> = ({ brick, onSelect }) => (
  <ListGroup.Item onClick={onSelect} className={cx(styles.root)}>
    <div className="d-flex">
      <div className="mr-2 text-muted">
        <BrickIcon brick={brick} />
      </div>
      <div className={cx("flex-grow-1", styles.titleColumn)}>
        <div className={styles.ellipsis}>{brick.name}</div>
        <code className={cx("small", styles.id)}>{brick.id}</code>
        <p className={cx("small mb-0", styles.ellipsis)}>
          {/* FIXME: applying both truncate and the CSS ellipses style is redundant */}
          {/* Use a span if no description to ensure a consistent height for react-window */}
          {brick.description ? (
            truncate(brick.description, { length: 256 })
          ) : (
            <span>&nbsp;</span>
          )}
        </p>
      </div>
      <div className="flex-grow-0">
        <OfficialBadge id={brick.id} />
      </div>
    </div>
  </ListGroup.Item>
);

export default BrickResult;
