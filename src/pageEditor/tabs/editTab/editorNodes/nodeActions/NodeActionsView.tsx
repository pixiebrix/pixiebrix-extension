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
import styles from "./NodeActionsView.module.scss";
import { isEmpty } from "lodash";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import TooltipIconButton from "@/components/TooltipIconButton";

export type NodeAction = {
  /**
   * This is used to construct the data-testid for the button
   * @see TooltipIconButton
   */
  name: string;
  icon: IconProp;
  tooltipText: string;
  onClick: () => void;
};

type NodeActionsProps = {
  nodeActions: NodeAction[];
  showBiggerActions?: boolean;
};

const NodeActionsView: React.VFC<NodeActionsProps> = ({
  nodeActions,
  showBiggerActions,
}) => (
  <div
    className={cx(styles.root, {
      [styles.biggerActions]: showBiggerActions && !isEmpty(nodeActions),
    })}
  >
    {nodeActions.map(({ name, icon, onClick, tooltipText }, index) => (
      <TooltipIconButton
        key={index} // Actions are not re-ordered, so using index key is fine
        name={name}
        icon={icon}
        onClick={onClick}
        tooltipText={tooltipText}
      />
    ))}
  </div>
);

export default NodeActionsView;
