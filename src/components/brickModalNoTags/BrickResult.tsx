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
import { Button, ListGroup } from "react-bootstrap";
import cx from "classnames";
import styles from "@/options/pages/brickEditor/referenceTab/BlockResult.module.scss";
import BrickIcon from "@/components/BrickIcon";
import { OfficialBadge } from "@/components/OfficialBadge";

const BrickResult: React.FunctionComponent<{
  brick: IBrick;
  onSelect: () => void;
  onShowDetail: () => void;
  active?: boolean;
  selectCaption: React.ReactNode;
}> = ({ brick, onSelect, onShowDetail, selectCaption, active }) => (
  <ListGroup.Item
    onClick={onShowDetail}
    className={cx(styles.root, { [styles.active]: active, active })}
  >
    <div className="d-flex">
      <div className="mr-2 text-muted">
        <BrickIcon brick={brick} />
      </div>
      <div className={cx("flex-grow-1", styles.titleColumn)}>
        <div className={styles.ellipsis}>{brick.name}</div>
        <code className={cx("small", styles.id)}>{brick.id}</code>
        <p className={cx("small mb-0", styles.ellipsis)}>
          {/* Use a span if no description to ensure a consistent height for react-window */}
          {brick.description ? `${brick.description}` : <span>&nbsp;</span>}
        </p>
      </div>
      <div className={cx("flex-grow-0", styles.officialBadge)}>
        <OfficialBadge id={brick.id} />
      </div>
      <div
        className={cx(
          "align-items-center justify-content-end",
          styles.actionButtons
        )}
      >
        <Button
          variant="primary"
          className="mb-1 text-nowrap"
          onClick={onSelect}
        >
          {selectCaption}
        </Button>
      </div>
    </div>
  </ListGroup.Item>
);

export default BrickResult;
