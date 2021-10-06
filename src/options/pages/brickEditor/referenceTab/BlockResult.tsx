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
import { ListGroup } from "react-bootstrap";
import cx from "classnames";
import { ReferenceEntry } from "@/options/pages/brickEditor/brickEditorTypes";
import styles from "./BlockResult.module.scss";
import { OfficialBadge } from "@/components/OfficialBadge";
import BrickIcon from "@/components/BrickIcon";
import { faGlobe } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const BlockResult: React.FunctionComponent<{
  block: ReferenceEntry;
  active?: boolean;
  onSelect: () => void;
}> = ({ block, onSelect, active }) => (
  <ListGroup.Item
    onClick={onSelect}
    className={cx(styles.root, { [styles.active]: active, active })}
  >
    <div className="d-flex">
      <div className="mr-2 text-muted">
        <BrickIcon brick={block} />
      </div>
      <div className={cx("flex-grow-1", styles.titleColumn)}>
        <div className="d-flex justify-content-between">
          <div className={cx(styles.ellipsis, "mb-1")}>{block.name}</div>
          <OfficialBadge id={block.id} />
        </div>
        <div className="d-flex justify-content-between align-items-center">
          <code className={cx(styles.id, "flex-shrink-1 small")}>
            {block.id}
          </code>
          <div className={cx(styles.sharing)}>
            <div className={cx(styles.ellipsis, "small text-right pl-2")}>
              <FontAwesomeIcon icon={faGlobe} className="mr-1" />
              Public
            </div>
          </div>
        </div>
      </div>
    </div>
  </ListGroup.Item>
);

export default BlockResult;
