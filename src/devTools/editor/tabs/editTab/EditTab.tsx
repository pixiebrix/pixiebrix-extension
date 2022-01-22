/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

import React, { useCallback, useContext, useMemo } from "react";
import { Col, Tab } from "react-bootstrap";
import EditorNodeLayout, {
  FOUNDATION_NODE_ID,
  NodeId,
} from "@/devTools/editor/tabs/editTab/editorNodeLayout/EditorNodeLayout";
import { useFormikContext } from "formik";
import { ADAPTERS } from "@/devTools/editor/extensionPoints/adapter";
import { BlockType } from "@/blocks/util";
import { useAsyncState } from "@/hooks/common";
import blockRegistry, { TypedBlockMap } from "@/blocks/registry";
import EditorNodeConfigPanel from "@/devTools/editor/tabs/editTab/editorNodeConfigPanel/EditorNodeConfigPanel";
import styles from "./EditTab.module.scss";
import { actions, FormState } from "@/devTools/editor/slices/editorSlice";
import ErrorBoundary from "@/components/ErrorBoundary";
import BrickIcon from "@/components/BrickIcon";
import { isNullOrBlank } from "@/utils";
import ConnectedFieldTemplate from "@/components/form/ConnectedFieldTemplate";
import DataPanel from "@/devTools/editor/tabs/editTab/dataPanel/DataPanel";
import useExtensionTrace from "@/devTools/editor/hooks/useExtensionTrace";
import FoundationDataPanel from "@/devTools/editor/tabs/editTab/dataPanel/FoundationDataPanel";
import usePipelineField, {
  PIPELINE_BLOCKS_FIELD_NAME,
} from "@/devTools/editor/hooks/usePipelineField";
import { EditorNodeProps } from "@/devTools/editor/tabs/editTab/editorNode/EditorNode";
import { useDispatch, useSelector } from "react-redux";
import { selectActiveNodeId } from "@/devTools/editor/uiState/uiState";
import AuthContext from "@/auth/AuthContext";
import ApiVersionField from "@/devTools/editor/fields/ApiVersionField";
import useBlockPipelineActions from "@/devTools/editor/tabs/editTab/useBlockPipelineActions";
import useApiVersionAtLeast from "@/devTools/editor/hooks/useApiVersionAtLeast";
import UnsupportedApiV1 from "@/devTools/editor/tabs/editTab/UnsupportedApiV1";
import UpgradedToApiV3 from "@/devTools/editor/tabs/editTab/UpgradedToApiV3";
import { isInnerExtensionPoint } from "@/runtime/runtimeUtils";

const EditTab: React.FC<{
  eventKey: string;
}> = ({ eventKey }) => {
  useExtensionTrace();

  const { values, setValues: setFormValues } = useFormikContext<FormState>();
  const { extensionPoint, type: elementType } = values;

  // For now, don't allow modifying extensionPoint packages via the Page Editor.
  const isLocked = useMemo(
    () => !isInnerExtensionPoint(extensionPoint.metadata.id),
    [extensionPoint.metadata.id]
  );

  const isApiAtLeastV2 = useApiVersionAtLeast("v2");

  const { label, icon, EditorNode } = useMemo(() => ADAPTERS.get(elementType), [
    elementType,
  ]);

  const FoundationNode = isApiAtLeastV2 ? EditorNode : UnsupportedApiV1;

  const [allBlocks] = useAsyncState<TypedBlockMap>(
    async () => blockRegistry.allTyped(),
    [],
    new Map()
  );

  const {
    blockPipeline,
    blockPipelineErrors,
    errorTraceEntry,
  } = usePipelineField(allBlocks, elementType);

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

  const nodes = useMemo<EditorNodeProps[]>(() => {
    const blockNodes: EditorNodeProps[] = blockPipeline.map(
      (blockConfig, index) => {
        const block = allBlocks.get(blockConfig.id)?.block;
        const nodeId = blockConfig.instanceId;

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
          onClick: () => {
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
      onClick: () => {
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
  ]);

  const [relevantBlocksToAdd] = useAsyncState(
    async () => {
      const excludeType: BlockType = ["actionPanel", "panel"].includes(
        elementType
      )
        ? "effect"
        : "renderer";

      return [...allBlocks.values()]
        .filter(({ type }) => type != null && type !== excludeType)
        .map(({ block }) => block);
    },
    [allBlocks, elementType],
    []
  );

  const blockError: string =
    // eslint-disable-next-line security/detect-object-injection
    typeof blockPipelineErrors?.[activeBlockIndex] === "string"
      ? // eslint-disable-next-line security/detect-object-injection
        (blockPipelineErrors[activeBlockIndex] as string)
      : null;

  const { flags } = useContext(AuthContext);
  const showVersionField = flags.includes("page-editor-developer");

  return (
    <Tab.Pane eventKey={eventKey} className={styles.tabPane}>
      <div className={styles.paneContent}>
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
        <div className={styles.configPanel}>
          <ErrorBoundary
            key={
              // Pass key to error boundary so that switching the node can potentially avoid the bad state without
              // having to reload the whole page editor frame
              activeNodeId
            }
          >
            {activeNodeId === FOUNDATION_NODE_ID ? (
              <Col>
                <ConnectedFieldTemplate name="label" label="Extension Name" />
                {showVersionField && <ApiVersionField />}
                <UpgradedToApiV3 />
                <FoundationNode isLocked={isLocked} />
              </Col>
            ) : isApiAtLeastV2 ? (
              <EditorNodeConfigPanel
                key={activeNodeId}
                blockFieldName={blockFieldName}
                blockId={
                  blockPipeline.find((x) => x.instanceId === activeNodeId)?.id
                }
                blockError={blockError}
                onRemoveNode={() => {
                  removeBlock(activeNodeId);
                }}
                copyBlock={() => {
                  copyBlock(activeNodeId);
                }}
              />
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
