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

import React, { useCallback, useMemo } from "react";
import { Col, Tab } from "react-bootstrap";
import EditorNodeLayout from "@/pageEditor/tabs/editTab/editorNodeLayout/EditorNodeLayout";
import { useFormikContext } from "formik";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import { useAsyncState } from "@/hooks/common";
import blockRegistry, { TypedBlockMap } from "@/blocks/registry";
import EditorNodeConfigPanel from "@/pageEditor/tabs/editTab/editorNodeConfigPanel/EditorNodeConfigPanel";
import styles from "./EditTab.module.scss";
import { actions } from "@/pageEditor/slices/editorSlice";
import ErrorBoundary from "@/components/ErrorBoundary";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import DataPanel from "@/pageEditor/tabs/editTab/dataPanel/DataPanel";
import useExtensionTrace from "@/pageEditor/hooks/useExtensionTrace";
import FoundationDataPanel from "@/pageEditor/tabs/editTab/dataPanel/FoundationDataPanel";
import usePipelineField, {
  PIPELINE_BLOCKS_FIELD_NAME,
} from "@/pageEditor/hooks/usePipelineField";
import { NodeId } from "@/pageEditor/tabs/editTab/editorNode/EditorNode";
import { useDispatch, useSelector } from "react-redux";
import { FOUNDATION_NODE_ID } from "@/pageEditor/uiState/uiState";
import { selectActiveNodeId } from "@/pageEditor/slices/editorSelectors";
import ApiVersionField from "@/pageEditor/fields/ApiVersionField";
import useBlockPipelineActions from "@/pageEditor/tabs/editTab/useBlockPipelineActions";
import useApiVersionAtLeast from "@/pageEditor/hooks/useApiVersionAtLeast";
import UnsupportedApiV1 from "@/pageEditor/tabs/editTab/UnsupportedApiV1";
import UpgradedToApiV3 from "@/pageEditor/tabs/editTab/UpgradedToApiV3";
import TooltipIconButton from "@/components/TooltipIconButton";
import { faCopy, faTrash } from "@fortawesome/free-solid-svg-icons";
import cx from "classnames";
import useFlags from "@/hooks/useFlags";
import { BlockType } from "@/runtime/runtimeTypes";
import { FormState } from "@/pageEditor/pageEditorTypes";
import { isInnerExtensionPoint } from "@/registry/internal";
import useReportTraceError from "./useReportTraceError";
import useNodes from "./useNodes";
import devtoolFieldOverrides from "@/pageEditor/fields/devtoolFieldOverrides";
import SchemaFieldContext from "@/components/fields/schemaFields/SchemaFieldContext";

const EditTab: React.FC<{
  eventKey: string;
}> = ({ eventKey }) => {
  useExtensionTrace();
  useReportTraceError();

  const { values, setValues: setFormValues } = useFormikContext<FormState>();
  const { extensionPoint, type: extensionPointType } = values;

  // For now, don't allow modifying extensionPoint packages via the Page Editor.
  const isLocked = useMemo(
    () => !isInnerExtensionPoint(extensionPoint.metadata.id),
    [extensionPoint.metadata.id]
  );

  const isApiAtLeastV2 = useApiVersionAtLeast("v2");

  const { label, icon, EditorNode } = useMemo(
    () => ADAPTERS.get(extensionPointType),
    [extensionPointType]
  );

  const [allBlocks] = useAsyncState<TypedBlockMap>(
    async () => blockRegistry.allTyped(),
    [],
    new Map()
  );

  const { blockPipeline, pipelineMap, blockPipelineErrors, errorTraceEntry } =
    usePipelineField(allBlocks, extensionPointType);

  const activeNodeId = useSelector(selectActiveNodeId);
  const dispatch = useDispatch();
  const setActiveNodeId = useCallback(
    (nodeId: NodeId) => {
      dispatch(actions.setElementActiveNodeId(nodeId));
    },
    [dispatch]
  );

  const activeBlockIndex = useMemo(() => {
    if (activeNodeId === FOUNDATION_NODE_ID) {
      return 0;
    }

    return blockPipeline.findIndex(
      (block) => block.instanceId === activeNodeId
    );
  }, [activeNodeId, blockPipeline]);

  const lastBlockPipelineId = blockPipeline[blockPipeline.length - 1]?.id;
  const lastBlock = useMemo(
    () =>
      lastBlockPipelineId ? allBlocks.get(lastBlockPipelineId) : undefined,
    [allBlocks, lastBlockPipelineId]
  );
  const [showAppendNode] = useAsyncState(
    async () => {
      if (!lastBlock) {
        return true;
      }

      if (!lastBlock?.block) {
        return true;
      }

      return lastBlock.type !== "renderer";
    },
    [lastBlock],
    false
  );

  const {
    addBlock,
    removeBlock,
    moveBlockUp,
    moveBlockDown,
    copyBlock,
    pasteBlock,
  } = useBlockPipelineActions(
    blockPipeline,
    values,
    setFormValues,
    setActiveNodeId
  );

  const nodes = useNodes(
    blockPipeline,
    blockPipelineErrors,
    errorTraceEntry,
    label,
    icon,
    allBlocks,
    setActiveNodeId
  );

  const [relevantBlocksToAdd] = useAsyncState(
    async () => {
      const excludeType: BlockType = ["actionPanel", "panel"].includes(
        extensionPointType
      )
        ? "effect"
        : "renderer";

      return [...allBlocks.values()]
        .filter(({ type }) => type != null && type !== excludeType)
        .map(({ block }) => block);
    },
    [allBlocks, extensionPointType],
    []
  );

  const blockError: string =
    // eslint-disable-next-line security/detect-object-injection
    typeof blockPipelineErrors?.[activeBlockIndex] === "string"
      ? // eslint-disable-next-line security/detect-object-injection
        (blockPipelineErrors[activeBlockIndex] as string)
      : null;

  const { flagOn } = useFlags();
  const showVersionField = flagOn("page-editor-developer");

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
            <EditorNodeLayout
              nodes={nodes}
              activeNodeId={activeNodeId}
              relevantBlocksToAdd={relevantBlocksToAdd}
              addBlock={addBlock}
              showAppend={showAppendNode}
              moveBlockUp={moveBlockUp}
              moveBlockDown={moveBlockDown}
              pasteBlock={pasteBlock}
            />
          </div>
        </div>
        <div className={styles.configPanel}>
          <Col>
            <ErrorBoundary
              key={
                // Pass key to error boundary so that switching the node can potentially avoid the bad state without
                // having to reload the whole page editor frame
                activeNodeId
              }
            >
              {isApiAtLeastV2 ? (
                activeNodeId === FOUNDATION_NODE_ID ? (
                  <>
                    <ConnectedFieldTemplate
                      name="label"
                      label="Extension Name"
                    />
                    {showVersionField && <ApiVersionField />}
                    <UpgradedToApiV3 />
                    <SchemaFieldContext.Provider value={devtoolFieldOverrides}>
                      <EditorNode isLocked={isLocked} />
                    </SchemaFieldContext.Provider>
                  </>
                ) : (
                  <EditorNodeConfigPanel
                    key={activeNodeId}
                    blockFieldName={pipelineMap[activeNodeId].fieldName}
                    blockId={pipelineMap[activeNodeId]?.blockId}
                    blockError={blockError}
                  />
                )
              ) : (
                <UnsupportedApiV1 />
              )}
            </ErrorBoundary>
          </Col>
        </div>
        <div className={styles.dataPanel}>
          {activeNodeId === FOUNDATION_NODE_ID ? (
            <FoundationDataPanel
              firstBlockInstanceId={blockPipeline[0]?.instanceId}
            />
          ) : (
            <DataPanel key={activeNodeId} instanceId={activeNodeId} />
          )}
        </div>
      </div>
    </Tab.Pane>
  );
};

export default EditTab;
