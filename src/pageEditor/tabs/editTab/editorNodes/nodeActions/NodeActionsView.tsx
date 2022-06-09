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

export type NodeAction = React.ReactNode;

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
    {nodeActions}
  </div>
);

export default NodeActionsView;
