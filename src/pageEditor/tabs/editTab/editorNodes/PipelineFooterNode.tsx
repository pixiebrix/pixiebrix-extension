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
import cx from "classnames";
import styles from "./PipelineFooterNode.module.scss";
import OutputKeyView from "@/pageEditor/tabs/editTab/editorNodes/OutputKeyView";
import PipelineOffsetView from "@/pageEditor/tabs/editTab/editorNodes/PipelineOffsetView";
import { OutputKey } from "@/core";

export type PipelineFooterNodeProps = {
  outputKey: OutputKey;
  nodeActions: NodeAction[];
  nestingLevel: number;
  active?: boolean;
};

const PipelineFooterNode: React.VFC<PipelineFooterNodeProps> = ({
  outputKey,
  nodeActions,
  nestingLevel,
  active,
}) => (
  <>
    <div className={styles.footer}>
      <PipelineOffsetView nestingLevel={nestingLevel} />
      <div className={styles.pipelineContainer}>
        <div className={cx(styles.pipelineEnd, { [styles.active]: active })} />
      </div>
      <OutputKeyView outputKey={outputKey} />
    </div>
    <NodeActionsView nodeActions={nodeActions} />
  </>
);

export default PipelineFooterNode;
