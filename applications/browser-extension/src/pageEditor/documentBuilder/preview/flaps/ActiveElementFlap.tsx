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

import React from "react";
import cx from "classnames";
import SelectParentIcon from "../../../../icons/select-parent.svg?loadAsComponent";
import ArrowUpwardIcon from "../../../../icons/arrow-upward.svg?loadAsComponent";
import ArrowDownwardIcon from "../../../../icons/arrow-downward.svg?loadAsComponent";
import DuplicateIcon from "../../../../icons/duplicate.svg?loadAsComponent";
import DeleteIcon from "../../../../icons/delete.svg?loadAsComponent";
import useDeleteElement from "../../hooks/useDeleteElement";
import useSelectParentElement from "../../hooks/useSelectParentElement";
import useMoveWithinParent from "../../hooks/useMoveWithinParent";
import styles from "./ActiveElementFlap.module.scss";
import flapStyles from "./Flaps.module.scss";
import useDuplicateElement from "../../hooks/useDuplicateElement";

type ActiveElementFlapProps = {
  className?: string;
  documentBodyName: string;
  elementName: string;
};

const ActiveElementFlap: React.FunctionComponent<ActiveElementFlapProps> = ({
  className,
  documentBodyName,
  elementName,
}) => {
  const selectParent = useSelectParentElement();
  const deleteElement = useDeleteElement(documentBodyName);
  const duplicateElement = useDuplicateElement(documentBodyName);

  const { canMoveUp, canMoveDown, moveElement } =
    useMoveWithinParent(documentBodyName);

  return (
    <div className={cx(flapStyles.root, className)}>
      <SelectParentIcon
        className={styles.icon}
        role="button"
        onClick={() => {
          selectParent(elementName);
        }}
      />

      <ArrowUpwardIcon
        className={styles.icon}
        role="button"
        data-disabled={!canMoveUp}
        onClick={() => {
          if (canMoveUp) {
            moveElement("up");
          }
        }}
      />

      <ArrowDownwardIcon
        className={styles.icon}
        role="button"
        data-disabled={!canMoveDown}
        onClick={() => {
          if (canMoveDown) {
            moveElement("down");
          }
        }}
      />

      <DuplicateIcon
        className={styles.icon}
        role="button"
        onClick={async () => {
          await duplicateElement(elementName);
        }}
      />

      <DeleteIcon
        className={styles.icon}
        role="button"
        onClick={async () => {
          await deleteElement(elementName);
        }}
      />
    </div>
  );
};

export default ActiveElementFlap;
