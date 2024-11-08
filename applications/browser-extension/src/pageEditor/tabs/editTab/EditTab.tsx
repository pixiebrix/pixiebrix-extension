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

import React from "react";
import { Collapse, Tab } from "react-bootstrap";
import EditorNodeLayout from "./editorNodeLayout/EditorNodeLayout";
import EditorNodeConfigPanel from "./editorNodeConfigPanel/EditorNodeConfigPanel";
import styles from "./EditTab.module.scss";
import ErrorBoundary from "@/components/ErrorBoundary";
import BrickDataPanel from "./dataPanel/BrickDataPanel";
import useModComponentTrace from "../../hooks/useModComponentTrace";
import StarterBrickDataPanel from "./dataPanel/StarterBrickDataPanel";
import { useDispatch, useSelector } from "react-redux";
import { FOUNDATION_NODE_ID } from "../../store/editor/uiState";
import {
  selectActiveNodeId,
  selectIsDataPanelExpanded,
  selectPipelineMap,
} from "../../store/editor/editorSelectors";
import useApiVersionAtLeast from "../../hooks/useApiVersionAtLeast";
import UnsupportedRuntimeVersion from "./UnsupportedRuntimeVersion";
import TooltipIconButton from "@/components/TooltipIconButton";
import {
  faAngleDoubleLeft,
  faCopy,
  faTrash,
} from "@fortawesome/free-solid-svg-icons";
import cx from "classnames";
import useReportTraceError from "./useReportTraceError";
import StarterBrickConfigPanel from "./StarterBrickConfigPanel";
import { type UUID } from "@/types/stringTypes";
import { actions } from "../../store/editor/editorSlice";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { assertNotNullish } from "@/utils/nullishUtils";

const EditTab: React.FC<{
  eventKey: string;
}> = ({ eventKey }) => {
  const dispatch = useDispatch();

  useModComponentTrace();
  useReportTraceError();

  const isRuntimeVersionSupported = useApiVersionAtLeast("v3");
  const activeNodeId = useSelector(selectActiveNodeId);

  const pipelineMap = useSelector(selectPipelineMap);

  const isDataPanelExpanded = useSelector(selectIsDataPanelExpanded);

  function copyBrick(instanceId: UUID) {
    // eslint-disable-next-line security/detect-object-injection -- UUID
    const brickToCopy = pipelineMap[instanceId]?.blockConfig;
    if (brickToCopy) {
      dispatch(actions.copyBrickConfig(brickToCopy));
    }
  }

  function removeBrick(nodeIdToRemove: UUID) {
    dispatch(actions.removeNode(nodeIdToRemove));
  }

  return (
    <Tab.Pane eventKey={eventKey} className={styles.tabPane}>
      <div className={styles.paneContent}>
        <div className={styles.nodePanel} data-testid="brickActionsPanel">
          <div className={styles.nodeHeader}>
            <span
              className={cx(styles.nodeHeaderTitle, {
                [styles.disabledTitle ?? ""]:
                  activeNodeId === FOUNDATION_NODE_ID,
              })}
            >
              Brick Actions
            </span>
            <TooltipIconButton
              name="copyNode"
              icon={faCopy}
              onClick={() => {
                assertNotNullish(
                  activeNodeId,
                  "activeNodeId is required to copy a node",
                );
                copyBrick(activeNodeId);
              }}
              tooltipText="Copy Brick"
              buttonClassName={styles.copyButton}
              disabled={activeNodeId === FOUNDATION_NODE_ID}
            />
            <TooltipIconButton
              name="removeNode"
              icon={faTrash}
              onClick={() => {
                assertNotNullish(
                  activeNodeId,
                  "activeNodeId is required to remove a node",
                );
                removeBrick(activeNodeId);
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
        <div
          className={styles.configPanel}
          data-testid="brickConfigurationPanel"
        >
          <ErrorBoundary
            key={
              // Pass in the activeNodeId as the render key for error boundary so
              // that switching the node can potentially avoid the bad state without
              // having to reload the whole page editor frame
              activeNodeId
            }
          >
            {isRuntimeVersionSupported ? (
              activeNodeId === FOUNDATION_NODE_ID ? (
                <StarterBrickConfigPanel />
              ) : (
                <EditorNodeConfigPanel />
              )
            ) : (
              <UnsupportedRuntimeVersion />
            )}
          </ErrorBoundary>
        </div>
        <div className={styles.collapseWrapper} data-testid="dataPanel">
          <button
            className={cx(styles.toggle, {
              [styles.active ?? ""]: isDataPanelExpanded,
            })}
            type="button"
            onClick={() => {
              dispatch(
                actions.setDataPanelExpanded({
                  isExpanded: !isDataPanelExpanded,
                }),
              );
            }}
          >
            <FontAwesomeIcon icon={faAngleDoubleLeft} />
          </button>
          <Collapse
            dimension="width"
            in={isDataPanelExpanded}
            unmountOnExit={true}
            mountOnEnter={true}
          >
            <div className={styles.dataPanelWrapper}>
              <div className={styles.dataPanel}>
                {activeNodeId === FOUNDATION_NODE_ID ? (
                  <StarterBrickDataPanel />
                ) : (
                  <BrickDataPanel key={activeNodeId} />
                )}
              </div>
            </div>
          </Collapse>
        </div>
      </div>
    </Tab.Pane>
  );
};

export default EditTab;
