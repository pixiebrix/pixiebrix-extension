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
import BlockIcon from "@/components/BlockIcon";

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
        <BlockIcon block={block} />
      </div>
      <div className={cx("flex-grow-1", styles.titleColumn)}>
        <div className={styles.ellipsis}>{block.name}</div>
        <code className={cx("small", styles.id)}>{block.id}</code>
      </div>
      <div className="flex-grow-0">
        <OfficialBadge id={block.id} />
      </div>
    </div>
  </ListGroup.Item>
);

export default BlockResult;
