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
import NodeActionsView, {
  NodeAction,
} from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/NodeActionsView";
import styles from "./PipelineHeaderNode.module.scss";
import PipelineOffsetView from "@/pageEditor/tabs/editTab/editorNodes/PipelineOffsetView";
import cx from "classnames";

export type PipelineHeaderNodeProps = {
  headerLabel: string;
  nestingLevel: number;
  nodeActions: NodeAction[];
  active?: boolean;
};

const PipelineHeaderNode: React.VFC<PipelineHeaderNodeProps> = ({
  headerLabel,
  nestingLevel,
  nodeActions,
  active,
}) => (
  <div className={styles.root}>
    <PipelineOffsetView nestingLevel={nestingLevel} parentIsActive={active} />
    <div className={cx(styles.header, { [styles.active]: active })}>
      <div className={styles.headerPipeLineTop} />
      <div className={styles.subPipelineLabel}>{headerLabel}</div>
      <div className={styles.headerPipeLineBottom} />
      <NodeActionsView nodeActions={nodeActions} />
    </div>
  </div>
);

export default PipelineHeaderNode;
