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

import React, { useEffect, useRef } from "react";
import NodeActionsView, {
  type NodeAction,
} from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/NodeActionsView";
import styles from "./PipelineHeaderNode.module.scss";
import PipelineOffsetView from "@/pageEditor/tabs/editTab/editorNodes/PipelineOffsetView";
import cx from "classnames";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSignInAlt } from "@fortawesome/free-solid-svg-icons";
import { ListGroup } from "react-bootstrap";

export const SCROLL_TO_HEADER_NODE_EVENT = "scroll-header-node-into-view";

export type PipelineHeaderNodeProps = {
  headerLabel: string;
  nestingLevel: number;
  nodeActions: NodeAction[];
  nodePreviewElement: {
    name: string;
    focus: () => void;
    active: boolean;
  } | null;
  pipelineInputKey?: string;
  active?: boolean;
  nestedActive?: boolean;
  isPipelineLoading: boolean;
};

const PipelineHeaderNode: React.VFC<PipelineHeaderNodeProps> = ({
  headerLabel,
  nestingLevel,
  nodeActions,
  pipelineInputKey,
  active,
  nestedActive,
  nodePreviewElement,
  isPipelineLoading,
}) => {
  const nodeRef = useRef(null);

  const scrollIntoView = () => {
    nodeRef.current.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    if (!nodePreviewElement || isPipelineLoading) {
      return;
    }

    window.addEventListener(
      `${SCROLL_TO_HEADER_NODE_EVENT}-${nodePreviewElement.name}`,
      scrollIntoView
    );

    if (nodePreviewElement?.active) {
      scrollIntoView();
    }

    return () => {
      window.removeEventListener(
        `${SCROLL_TO_HEADER_NODE_EVENT}-${nodePreviewElement.name}`,
        scrollIntoView
      );
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run when loading completes to prevent multiple event listeners from being added
  }, [isPipelineLoading]);

  return (
    <>
      <ListGroup.Item
        className={cx(styles.root, {
          [styles.clickable]: Boolean(nodePreviewElement),
        })}
        onClick={nodePreviewElement?.focus}
        ref={nodeRef}
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
          <div className={styles.headerContent}>
            <div className={styles.labelAndInputKey}>
              <div className={styles.subPipelineLabel}>{headerLabel}</div>
              {pipelineInputKey && (
                <div className={styles.subPipelineInputKey}>
                  @{pipelineInputKey}
                </div>
              )}
            </div>
            {nodePreviewElement && (
              <FontAwesomeIcon
                icon={faSignInAlt}
                size="sm"
                className={styles.documentPreviewIcon}
              />
            )}
          </div>
        </div>
      </ListGroup.Item>
      <NodeActionsView nodeActions={nodeActions} />
    </>
  );
};

export default PipelineHeaderNode;
