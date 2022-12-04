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
import { Col, Tab } from "react-bootstrap";
import EditorNodeLayout from "@/pageEditor/tabs/editTab/editorNodeLayout/EditorNodeLayout";
import EditorNodeConfigPanel from "@/pageEditor/tabs/editTab/editorNodeConfigPanel/EditorNodeConfigPanel";
import styles from "./EditTab.module.scss";
import ErrorBoundary from "@/components/ErrorBoundary";
import DataPanel from "@/pageEditor/tabs/editTab/dataPanel/DataPanel";
import useExtensionTrace from "@/pageEditor/hooks/useExtensionTrace";
import FoundationDataPanel from "@/pageEditor/tabs/editTab/dataPanel/FoundationDataPanel";
import { useDispatch, useSelector } from "react-redux";
import { FOUNDATION_NODE_ID } from "@/pageEditor/uiState/uiState";
import {
  selectActiveNodeId,
  selectPipelineMap,
} from "@/pageEditor/slices/editorSelectors";
import useApiVersionAtLeast from "@/pageEditor/hooks/useApiVersionAtLeast";
import UnsupportedApiV1 from "@/pageEditor/tabs/editTab/UnsupportedApiV1";
import TooltipIconButton from "@/components/TooltipIconButton";
import { faCopy, faTrash } from "@fortawesome/free-solid-svg-icons";
import cx from "classnames";
import useReportTraceError from "./useReportTraceError";
import FoundationNodeConfigPanel from "./FoundationNodeConfigPanel";
import { type UUID } from "@/core";
import { actions } from "@/pageEditor/slices/editorSlice";

const EditTab: React.FC<{
  eventKey: string;
}> = ({ eventKey }) => {
  const dispatch = useDispatch();

  useExtensionTrace();
  useReportTraceError();

  const isApiAtLeastV2 = useApiVersionAtLeast("v2");
  const activeNodeId = useSelector(selectActiveNodeId);

  const pipelineMap = useSelector(selectPipelineMap);

  function copyBlock(instanceId: UUID) {
    // eslint-disable-next-line security/detect-object-injection -- UUID
    const blockToCopy = pipelineMap[instanceId]?.blockConfig;
    if (blockToCopy) {
      dispatch(actions.copyBlockConfig(blockToCopy));
    }
  }

  function removeBlock(nodeIdToRemove: UUID) {
    dispatch(actions.removeNode(nodeIdToRemove));
  }

  return (
    <Tab.Pane eventKey={eventKey} className={styles.tabPane}>
      <div className={styles.paneContent}>
        <div className={styles.nodePanel}>
          <div className={styles.nodeHeader}>
            <span
              className={cx(styles.nodeHeaderTitle, {
                [styles.disabledTitle]: activeNodeId === FOUNDATION_NODE_ID,
              })}
            >
              Brick Actions
            </span>
            <TooltipIconButton
              name="copyNode"
              icon={faCopy}
              onClick={() => {
                copyBlock(activeNodeId);
              }}
              tooltipText="Copy Brick"
              buttonClassName={styles.copyButton}
              disabled={activeNodeId === FOUNDATION_NODE_ID}
            />
            <TooltipIconButton
              name="removeNode"
              icon={faTrash}
              onClick={() => {
                removeBlock(activeNodeId);
              }}
              tooltipText="Remove Brick"
              buttonClassName={styles.removeButton}
              disabled={activeNodeId === FOUNDATION_NODE_ID}
            />
          </div>
          <div className={styles.nodeLayout}>
            <EditorNodeLayout />
          </div>
        </div>
        <div className={styles.configPanel}>
          <Col>
            <ErrorBoundary
              key={
                // Pass in the activeNodeId as the render key for error boundary so
                // that switching the node can potentially avoid the bad state without
                // having to reload the whole page editor frame
                activeNodeId
              }
            >
              {isApiAtLeastV2 ? (
                activeNodeId === FOUNDATION_NODE_ID ? (
                  <FoundationNodeConfigPanel />
                ) : (
                  <EditorNodeConfigPanel />
                )
              ) : (
                <UnsupportedApiV1 />
              )}
            </ErrorBoundary>
          </Col>
        </div>
        <div className={styles.dataPanel}>
          {activeNodeId === FOUNDATION_NODE_ID ? (
            <FoundationDataPanel />
          ) : (
            <DataPanel key={activeNodeId} />
          )}
        </div>
      </div>
    </Tab.Pane>
  );
};

export default EditTab;
