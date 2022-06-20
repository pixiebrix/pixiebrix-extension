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
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faArrowDown,
  faArrowUp,
  faLevelUpAlt,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import useDeleteElement from "@/components/documentBuilder/hooks/useDeleteElement";
import styles from "./ActiveLabel.module.scss";
import useSelectParentElement from "@/components/documentBuilder/hooks/useSelectParentElement";
import useMoveWithinParent from "@/components/documentBuilder/hooks/useMoveWithinParent";

type ActiveLabelProps = {
  className?: string;
  documentBodyName: string;
  elementName: string;
};

const ActiveLabel: React.FunctionComponent<ActiveLabelProps> = ({
  className,
  documentBodyName,
  elementName,
}) => {
  const selectParent = useSelectParentElement();
  const onSelectParent = () => {
    selectParent(elementName);
  };

  const deleteElement = useDeleteElement(documentBodyName);
  const onDelete = () => {
    deleteElement(elementName);
  };

  const { canMoveUp, canMoveDown, moveElement } =
    useMoveWithinParent(documentBodyName);

  return (
    <div className={cx(styles.root, className)}>
      <FontAwesomeIcon
        role="button"
        title="Select parent"
        icon={faLevelUpAlt}
        onClick={onSelectParent}
        fixedWidth
      />
      <FontAwesomeIcon
        role="button"
        title="Move up"
        icon={faArrowUp}
        data-disabled={!canMoveUp}
        onClick={() => {
          if (canMoveUp) {
            moveElement("up");
          }
        }}
        fixedWidth
      />
      <FontAwesomeIcon
        role="button"
        title="Move down"
        icon={faArrowDown}
        data-disabled={!canMoveDown}
        onClick={() => {
          if (canMoveDown) {
            moveElement("down");
          }
        }}
        fixedWidth
      />
      <FontAwesomeIcon
        role="button"
        title="Delete element"
        icon={faTrash}
        onClick={onDelete}
        fixedWidth
      />
    </div>
  );
};

export default ActiveLabel;
