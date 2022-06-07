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

import React, { useMemo } from "react";
import { Col, Tab } from "react-bootstrap";
import EditorNodeLayout from "@/pageEditor/tabs/editTab/editorNodeLayout/EditorNodeLayout";
import { useFormikContext } from "formik";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";
import { useAsyncState } from "@/hooks/common";
import blockRegistry, { TypedBlockMap } from "@/blocks/registry";
import EditorNodeConfigPanel from "@/pageEditor/tabs/editTab/editorNodeConfigPanel/EditorNodeConfigPanel";
import styles from "./EditTab.module.scss";
import ErrorBoundary from "@/components/ErrorBoundary";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import DataPanel from "@/pageEditor/tabs/editTab/dataPanel/DataPanel";
import useExtensionTrace from "@/pageEditor/hooks/useExtensionTrace";
import FoundationDataPanel from "@/pageEditor/tabs/editTab/dataPanel/FoundationDataPanel";
import usePipelineField from "@/pageEditor/hooks/usePipelineField";
import { useSelector } from "react-redux";
import { FOUNDATION_NODE_ID } from "@/pageEditor/uiState/uiState";
import {
  selectActiveNodeId,
  selectActiveNodeInfo,
  selectPipelineMap,
} from "@/pageEditor/slices/editorSelectors";
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
import { get } from "lodash";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";
import { useNodeAdapter } from "@/pageEditor/tabs/editTab/useNodeAdapter";

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

  const { blockPipeline, blockPipelineErrors, errorTraceEntry } =
    usePipelineField(allBlocks, extensionPointType);

  const activeNodeId = useSelector(selectActiveNodeId);
  const { blockId, path } = useSelector(selectActiveNodeInfo) ?? {};
  const fieldName = `${PIPELINE_BLOCKS_FIELD_NAME}.${path}`;
  const pipelineMap = useSelector(selectPipelineMap);

  const {
    addBlock,
    removeBlock,
    moveBlockUp,
    moveBlockDown,
    copyBlock,
    pasteBlock,
  } = useBlockPipelineActions(pipelineMap, values, setFormValues);

  const nodes = useNodes({
    pipeline: blockPipeline,
    pipelineErrors: blockPipelineErrors,
    errorTraceEntry,
    label,
    icon,
    allBlocks,
  });

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

  const renderNode = useNodeAdapter({
    addBlock,
    moveBlockUp,
    moveBlockDown,
    pasteBlock,
    relevantBlocksToAdd,
    allBlocks,
  });

  // The value of formikErrorForBlock can be object or string.
  const formikErrorForBlock = get(blockPipelineErrors, fieldName);
  // If formikErrorForBlock is a string, it means that this exact block has an error.
  const blockError: string =
    typeof formikErrorForBlock === "string" ? formikErrorForBlock : null;

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
              renderNode={renderNode}
              allBlocks={allBlocks}
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
                    blockFieldName={fieldName}
                    blockId={blockId}
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
            <DataPanel key={activeNodeId} />
          )}
        </div>
      </div>
    </Tab.Pane>
  );
};

export default EditTab;
