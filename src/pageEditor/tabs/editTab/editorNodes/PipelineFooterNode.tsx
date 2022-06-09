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
import TrailingMessage from "@/pageEditor/tabs/editTab/editorNodes/TrailingMessage";

export type PipelineFooterNodeProps = {
  outputKey: OutputKey;
  nodeActions: NodeAction[];
  showBiggerActions?: boolean;
  trailingMessage?: string;
  nestingLevel: number;
  active?: boolean;
  parentIsActive?: boolean;
};

const PipelineFooterNode: React.VFC<PipelineFooterNodeProps> = ({
  outputKey,
  nodeActions,
  showBiggerActions,
  trailingMessage,
  nestingLevel,
  active,
  parentIsActive,
}) => (
  <>
    <div
      className={cx(styles.footer, {
        [styles.active]: active,
        [styles.parentIsActive]: parentIsActive,
      })}
    >
      <PipelineOffsetView nestingLevel={nestingLevel} active={active} />
      <div className={styles.pipelineContainer}>
        <div
          className={cx(styles.pipelineEnd, {
            [styles.active]: active && !parentIsActive,
          })}
        />
      </div>
      <OutputKeyView
        outputKey={outputKey}
        className={cx(styles.outputKey, {
          [styles.active]: active && !parentIsActive,
        })}
      />
    </div>
    <NodeActionsView
      nodeActions={nodeActions}
      showBiggerActions={showBiggerActions}
    />
    {trailingMessage && <TrailingMessage message={trailingMessage} />}
  </>
);

export default PipelineFooterNode;
