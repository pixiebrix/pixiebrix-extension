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
import SelectParentIcon from "@/icons/select-parent.svg?loadAsComponent";
import ArrowUpwardIcon from "@/icons/arrow-upward.svg?loadAsComponent";
import ArrowDownwardIcon from "@/icons/arrow-downward.svg?loadAsComponent";
import DeleteIcon from "@/icons/delete.svg?loadAsComponent";
import useDeleteElement from "@/components/documentBuilder/hooks/useDeleteElement";
import useSelectParentElement from "@/components/documentBuilder/hooks/useSelectParentElement";
import useMoveWithinParent from "@/components/documentBuilder/hooks/useMoveWithinParent";
import styles from "./ActiveElementFlap.module.scss";
import flapStyles from "./Flaps.module.scss";

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
    <div className={cx(flapStyles.root, className)}>
      <SelectParentIcon
        className={styles.icon}
        role="button"
        onClick={onSelectParent}
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

      <DeleteIcon className={styles.icon} role="button" onClick={onDelete} />
    </div>
  );
};

export default ActiveElementFlap;
