/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
  type NodeAction,
} from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/NodeActionsView";
import styles from "./PipelineHeaderNode.module.scss";
import PipelineOffsetView from "@/pageEditor/tabs/editTab/editorNodes/PipelineOffsetView";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignInAlt } from "@fortawesome/free-solid-svg-icons";

export type PipelineHeaderNodeProps = {
  headerLabel: string;
  nestingLevel: number;
  nodeActions: NodeAction[];
  nodePreviewElementId: string | null;
  pipelineInputKey?: string;
  active?: boolean;
  nestedActive?: boolean;
};

const PipelineHeaderNode: React.VFC<PipelineHeaderNodeProps> = ({
  headerLabel,
  nestingLevel,
  nodeActions,
  pipelineInputKey,
  active,
  nestedActive,
  nodePreviewElementId,
}) => {
  const onClickHandler = () => {
    console.log("You clicked me!", nodePreviewElementId);
  };

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- TODO: make a decision about what to do here */}
      <div
        className={cx(styles.root, {
          [styles.clickable]: nodePreviewElementId,
        })}
        onClick={nodePreviewElementId ? onClickHandler : undefined}
      >
        <PipelineOffsetView
          nestingLevel={nestingLevel}
          nestedActive={active || nestedActive} // Color for this offset-view is chosen using the header flag
          isHeader={!nestedActive} // Don't color deeply-nested pipeline headers as active headers
        />
        <div
          className={cx(styles.header, {
            [styles.active]: active,
            [styles.nestedActive]: nestedActive,
          })}
        >
          <div className={styles.headerPipeLineTop} />
          <div className={styles.headerPipeLineBottom} />
          <div className={styles.subPipelineLabel}>{headerLabel}</div>
          {pipelineInputKey && (
            <div className={styles.subPipelineInputKey}>
              @{pipelineInputKey}
            </div>
          )}
          {nodePreviewElementId && (
            <FontAwesomeIcon
              icon={faSignInAlt}
              className={styles.documentPreviewIcon}
            />
          )}
        </div>
      </div>
      <NodeActionsView nodeActions={nodeActions} />
    </>
  );
};

export default PipelineHeaderNode;
