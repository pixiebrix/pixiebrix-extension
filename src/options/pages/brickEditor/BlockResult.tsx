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

import React, { useState } from "react";
import { Badge, ListGroup } from "react-bootstrap";
import { BlockType, getType } from "@/blocks/util";
import { useAsyncEffect } from "use-async-effect";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getIcon } from "@/components/fields/BlockModal";
import cx from "classnames";
import { ReferenceEntry } from "./brickEditorTypes";
import { isOfficial } from "./isOfficial";
import styles from "./BlockResult.module.scss";

export const BlockResult: React.FunctionComponent<{
  block: ReferenceEntry;
  active?: boolean;
  onSelect: () => void;
}> = ({ block, onSelect, active }) => {
  const [type, setType] = useState<BlockType>(null);

  useAsyncEffect(async () => {
    setType(await getType(block));
  }, [block, setType]);

  return (
    <ListGroup.Item
      onClick={onSelect}
      className={cx("BlockResult", { active })}
    >
      <div className="d-flex">
        <div className="mr-2 text-muted">
          <FontAwesomeIcon icon={getIcon(block, type)} fixedWidth />
        </div>
        <div className={cx("flex-grow-1", styles.titleColumn)}>
          <div className={styles.ellipsis}>{block.name}</div>
          <code className={cx("small", styles.id)}>{block.id}</code>
        </div>
        <div className="flex-grow-0 BlockResult__badges">
          {isOfficial(block) && <Badge variant="info">Official</Badge>}
        </div>
      </div>
    </ListGroup.Item>
  );
};
