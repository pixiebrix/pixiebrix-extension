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
  builderPreviewElement: {
    name: string;
    focus: () => void;
    active: boolean;
  } | null;
  pipelineInputKey?: string;
  active?: boolean;
  isParentActive?: boolean;
  isAncestorActive?: boolean;
  isPipelineLoading: boolean;
};

const PipelineHeaderNode: React.VFC<PipelineHeaderNodeProps> = ({
  headerLabel,
  nestingLevel,
  nodeActions,
  pipelineInputKey,
  active,
  isParentActive,
  isAncestorActive,
  builderPreviewElement,
  isPipelineLoading,
}) => {
  const nodeRef = useRef<HTMLAnchorElement | null>(null);

  const scrollIntoView = () => {
    nodeRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  useEffect(() => {
    if (!builderPreviewElement || isPipelineLoading) {
      return;
    }

    window.addEventListener(
      `${SCROLL_TO_HEADER_NODE_EVENT}-${builderPreviewElement.name}`,
      scrollIntoView,
    );

    if (builderPreviewElement?.active) {
      scrollIntoView();
    }

    return () => {
      window.removeEventListener(
        `${SCROLL_TO_HEADER_NODE_EVENT}-${builderPreviewElement.name}`,
        scrollIntoView,
      );
    };
    // TODO: validate multiple listerners aren't added (old ones should be removed automatically)
  }, [builderPreviewElement, isPipelineLoading]);

  return (
    <>
      <ListGroup.Item
        active={active}
        className={cx(styles.root, {
          [styles.clickable ?? ""]: Boolean(builderPreviewElement),
          [styles.parentNodeActive ?? ""]: isParentActive,
          [styles.ancestorActive ?? ""]: isAncestorActive,
        })}
        onClick={builderPreviewElement?.focus}
        ref={nodeRef}
      >
        <PipelineOffsetView nestingLevel={nestingLevel} active={active} />
        <div className={styles.header}>
          <div
            className={cx(styles.headerPipeLineTop, {
              [styles.active ?? ""]: active,
            })}
          />
          <div
            className={cx(styles.headerPipeLineBottom, {
              [styles.active ?? ""]: active,
            })}
          />
          <div className={styles.headerContent}>
            <div className={styles.labelAndInputKey}>
              <div className={styles.subPipelineLabel}>{headerLabel}</div>
              {pipelineInputKey && (
                <div className={styles.subPipelineInputKey}>
                  @{pipelineInputKey}
                </div>
              )}
            </div>
            {builderPreviewElement && (
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
