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
import BrickIcon from "@/components/BrickIcon";
import { isNullOrBlank } from "@/utils";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import DataPanel from "@/pageEditor/tabs/editTab/dataPanel/DataPanel";
import useExtensionTrace from "@/pageEditor/hooks/useExtensionTrace";
import FoundationDataPanel from "@/pageEditor/tabs/editTab/dataPanel/FoundationDataPanel";
import usePipelineField, {
  PIPELINE_BLOCKS_FIELD_NAME,
} from "@/pageEditor/hooks/usePipelineField";
import {
  EditorNodeProps,
  NodeId,
} from "@/pageEditor/tabs/editTab/editorNode/EditorNode";
import { useDispatch, useSelector } from "react-redux";
import {
  FOUNDATION_NODE_ID,
  selectActiveNodeId,
} from "@/pageEditor/uiState/uiState";
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
import { selectExtensionTrace } from "@/pageEditor/slices/runtimeSelectors";

const EditTab: React.FC<{
  eventKey: string;
}> = ({ eventKey }) => {
  useExtensionTrace();

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

  const blockFieldName = `${PIPELINE_BLOCKS_FIELD_NAME}[${activeBlockIndex}]`;

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

  const traces = useSelector(selectExtensionTrace);

  const nodes = useMemo<EditorNodeProps[]>(() => {
    const blockNodes: EditorNodeProps[] = blockPipeline.map(
      (blockConfig, index) => {
        const block = allBlocks.get(blockConfig.id)?.block;
        const nodeId = blockConfig.instanceId;
        const traceRecord = traces.find(
          (trace) => trace.blockInstanceId === nodeId
        );

        if (!block) {
          return {
            nodeId,
            title: "Loading...",
          };
        }

        const newBlock: EditorNodeProps = {
          nodeId,
          title: isNullOrBlank(blockConfig.label)
            ? block?.name
            : blockConfig.label,
          icon: (
            <BrickIcon
              brick={block}
              size="2x"
              // This makes brick icons that use basic font awesome icons
              //   inherit the editor node layout color scheme.
              // Customized SVG icons are unaffected and keep their branded
              //   color schemes.
              faIconClass={styles.brickFaIcon}
            />
          ),
          hasError:
            // If blockPipelineErrors is a string, it means the error is on the pipeline level
            typeof blockPipelineErrors !== "string" &&
            // eslint-disable-next-line security/detect-object-injection
            Boolean(blockPipelineErrors?.[index]),
          hasWarning:
            errorTraceEntry?.blockInstanceId === blockConfig.instanceId,
          skippedRun: traceRecord?.skippedRun,
          ran: traceRecord != null,
          onClick() {
            setActiveNodeId(blockConfig.instanceId);
          },
        };

        if (blockConfig.outputKey) {
          newBlock.outputKey = blockConfig.outputKey;
        }

        return newBlock;
      }
    );

    const foundationNode: EditorNodeProps = {
      nodeId: FOUNDATION_NODE_ID,
      outputKey: "input",
      title: label,
      icon,
      ran: traces.length > 0,
      onClick() {
        setActiveNodeId(FOUNDATION_NODE_ID);
      },
    };

    return [foundationNode, ...blockNodes];
  }, [
    allBlocks,
    blockPipeline,
    blockPipelineErrors,
    errorTraceEntry?.blockInstanceId,
    icon,
    label,
    setActiveNodeId,
    traces,
  ]);

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
          <ErrorBoundary
            key={
              // Pass key to error boundary so that switching the node can potentially avoid the bad state without
              // having to reload the whole page editor frame
              activeNodeId
            }
          >
            {isApiAtLeastV2 ? (
              activeNodeId === FOUNDATION_NODE_ID ? (
                <Col>
                  <ConnectedFieldTemplate name="label" label="Extension Name" />
                  {showVersionField && <ApiVersionField />}
                  <UpgradedToApiV3 />
                  <EditorNode isLocked={isLocked} />
                </Col>
              ) : (
                <EditorNodeConfigPanel
                  key={activeNodeId}
                  blockFieldName={blockFieldName}
                  blockId={
                    blockPipeline.find((x) => x.instanceId === activeNodeId)?.id
                  }
                  blockError={blockError}
                />
              )
            ) : (
              <UnsupportedApiV1 />
            )}
          </ErrorBoundary>
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
