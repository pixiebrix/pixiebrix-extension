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

import { Branch, BrickConfig, BrickPipeline } from "@/bricks/types";
import { PipelineFlavor } from "@/pageEditor/pageEditorTypes";
import { filterTracesByCall } from "@/telemetry/traceHelpers";
import { get, isEmpty } from "lodash";
import { NodeAction } from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/NodeActionsView";
import { faPaste, faPlusCircle } from "@fortawesome/free-solid-svg-icons";
import {
  actions as editorActions,
  actions,
} from "@/pageEditor/slices/editorSlice";
import {
  BrickNodeContentProps,
  BrickNodeProps,
} from "@/pageEditor/tabs/editTab/editTabTypes";
import {
  getBlockAnnotations,
  getDocumentPipelinePaths,
  getPipelinePropNames,
  getVariableKeyForSubPipeline,
} from "@/pageEditor/utils";
import BrickIcon from "@/components/BrickIcon";
import { decideBlockStatus } from "@/pageEditor/tabs/editTab/editorNodeLayout/decideStatus";
import { isNullOrBlank } from "@/utils/stringUtils";
import { Except } from "type-fest";
import { joinName, joinPathParts } from "@/utils/formUtils";
import { PipelineHeaderNodeProps } from "@/pageEditor/tabs/editTab/editorNodes/PipelineHeaderNode";
import { SCROLL_TO_DOCUMENT_PREVIEW_ELEMENT_EVENT } from "@/components/documentBuilder/preview/ElementPreview";
import { PipelineFooterNodeProps } from "@/pageEditor/tabs/editTab/editorNodes/PipelineFooterNode";
import React from "react";
import { Brick } from "@/types/brickTypes";
import { useDispatch, useSelector } from "react-redux";
import {
  selectActiveNodeId,
  selectCollapsedNodes,
} from "@/pageEditor/slices/editorSelectors";
import { selectActiveElementTraces } from "@/pageEditor/slices/runtimeSelectors";
import { DocumentRenderer } from "@/bricks/renderers/document";
import {
  DocumentElement,
  isButtonElement,
} from "@/components/documentBuilder/documentBuilderTypes";
import { UUID } from "@/types/stringTypes";

type EditorNodeProps =
  | (BrickNodeProps & { type: "brick"; key: string })
  | (PipelineHeaderNodeProps & { type: "header"; key: string })
  | (PipelineFooterNodeProps & { type: "footer"; key: string });

type MapOutput = {
  nodes: EditorNodeProps[];
  extensionHasTraces: boolean;
};

type SubPipeline = {
  /**
   * Label to show in the node layout
   */
  headerLabel: string;

  pipeline: BrickPipeline;

  /**
   * Formik path to the pipeline
   */
  path: string;

  flavor: PipelineFlavor;

  inputKey?: string;
};

/**
 *
 * @param block the block, or null if the resolved block is not available yet
 * @param blockConfig the block config
 */
function getSubPipelinesForBlock(
  block: Brick | null,
  blockConfig: BrickConfig
): SubPipeline[] {
  const subPipelines: SubPipeline[] = [];
  if (blockConfig.id === DocumentRenderer.BLOCK_ID) {
    for (const docPipelinePath of getDocumentPipelinePaths(blockConfig)) {
      const path = joinPathParts(docPipelinePath, "__value__");
      const pipeline: BrickPipeline = get(blockConfig, path) ?? [];

      // Removing the 'config.<pipelinePropName>' from the end of the docPipelinePath
      const elementPathParts = docPipelinePath.split(".").slice(0, -2);
      const element = get(blockConfig, elementPathParts) as DocumentElement;

      const isButton = isButtonElement(element);

      let subPipelineLabel = element.config.label as string;
      if (isEmpty(subPipelineLabel)) {
        subPipelineLabel = isButton ? "button" : "brick";
      }

      subPipelines.push({
        headerLabel: subPipelineLabel,
        pipeline,
        path,
        flavor: isButton ? PipelineFlavor.NoRenderer : PipelineFlavor.NoEffect,
      });
    }
  } else {
    for (const pipelinePropName of getPipelinePropNames(block, blockConfig)) {
      const path = joinName("config", pipelinePropName, "__value__");
      const pipeline: BrickPipeline = get(blockConfig, path) ?? [];

      const subPipeline: SubPipeline = {
        headerLabel: pipelinePropName,
        pipeline,
        path,
        flavor: PipelineFlavor.NoRenderer,
      };

      const inputKey = getVariableKeyForSubPipeline(
        blockConfig,
        pipelinePropName
      );

      if (inputKey) {
        subPipeline.inputKey = inputKey;
      }

      subPipelines.push(subPipeline);
    }
  }

  return subPipelines;
}

function useMapBlockToNodes({
  index,
  brickConfig,
  brick,
  latestPipelineCall,
  flavor,
  pipelinePath,
  lastIndex,
  isRootPipeline,
  showAppend,
  parentIsActive,
  nestingLevel,
  extensionHasTraces: extensionHasTracesInput,
}: {
  index: number;
  brickConfig: BrickConfig;
  brick: Brick;
  latestPipelineCall: Branch[];
  flavor: PipelineFlavor;
  pipelinePath: string;
  lastIndex: number;
  isRootPipeline: boolean;
  showAppend: boolean;
  parentIsActive: boolean;
  nestingLevel: number;
  extensionHasTraces?: boolean;
}): MapOutput {
  const dispatch = useDispatch();
  const activeNodeId = useSelector(selectActiveNodeId);
  const traces = useSelector(selectActiveElementTraces);
  const collapsedNodes = useSelector(selectCollapsedNodes);

  const nodes: EditorNodeProps[] = [];
  const nodeIsActive = brickConfig.instanceId === activeNodeId;

  function setActiveNodeId(nodeId: UUID) {
    dispatch(actions.setElementActiveNodeId(nodeId));
  }

  const traceRecords = filterTracesByCall(
    traces.filter((trace) => trace.blockInstanceId === brickConfig.instanceId),
    latestPipelineCall
  );

  if (traceRecords.length > 1) {
    console.warn(
      "filterTracesByCall for %s returned multiple trace records",
      brickConfig.instanceId,
      {
        traces,
        instanceId: brickConfig.instanceId,
        lastPipelineCall: latestPipelineCall,
      }
    );
  }

  const traceRecord = traceRecords[0];
  let extensionHasTraces = extensionHasTracesInput;

  if (traceRecord != null) {
    extensionHasTraces = true;
  }

  const subPipelines = getSubPipelinesForBlock(brick, brickConfig);
  const hasSubPipelines = !isEmpty(subPipelines);
  // TODO: put collapsed state into redux
  const collapsed = collapsedNodes[brickConfig.instanceId];
  const expanded = hasSubPipelines && !collapsed;

  const onClick = () => {
    if (nodeIsActive) {
      if (hasSubPipelines) {
        dispatch(
          actions.setCollapsedNode({
            nodeId: brickConfig.instanceId,
            collapsed: !collapsed,
          })
        );
      }
    } else {
      setActiveNodeId(brickConfig.instanceId);
    }
  };

  // Editor nodes are displayed from top to bottom in array order,
  // so, "up" in the UI is lower in the array, and "down" in the UI
  // is higher in the array. Also, you cannot move the foundation node,
  // which is always at index 0.
  const canMoveUp = index > 0;
  const canMoveDown = index < lastIndex;

  const onClickMoveUp = canMoveUp
    ? () => {
        moveBlockUp(brickConfig.instanceId);
      }
    : undefined;
  const onClickMoveDown = canMoveDown
    ? () => {
        moveBlockDown(brickConfig.instanceId);
      }
    : undefined;

  const hovered = hoveredState[brickConfig.instanceId];
  const onHoverChange = (hovered: boolean) => {
    setHoveredState((previousState) => ({
      ...previousState,
      [brickConfig.instanceId]: hovered,
    }));
  };

  const showAddBlock = isApiAtLeastV2 && (index < lastIndex || showAppend);
  const showBiggerActions = index === lastIndex && isRootPipeline;
  const showAddMessage = showAddBlock && showBiggerActions;

  const brickNodeActions: NodeAction[] = [];
  const nodeId = brickConfig.instanceId;

  // TODO: Refactoring - remove code duplication in the node actions here
  if (showAddBlock) {
    brickNodeActions.push({
      name: `${nodeId}-add-brick`,
      icon: faPlusCircle,
      tooltipText: "Add a brick",
      onClick() {
        dispatch(
          actions.showAddBlockModal({
            path: pipelinePath,
            flavor,
            index: index + 1,
          })
        );
      },
    });
  }

  if (showPaste) {
    brickNodeActions.push({
      name: `${nodeId}-paste-brick`,
      icon: faPaste,
      tooltipText: "Paste copied brick",
      async onClick() {
        await pasteBlock(pipelinePath, index + 1);
      },
    });
  }

  const trailingMessage = showAddMessage ? ADD_MESSAGE : undefined;

  let contentProps: BrickNodeContentProps = {
    brickLabel: "Loading...",
  };

  if (brick) {
    // Handle race condition on pipelineMap updates
    // eslint-disable-next-line security/detect-object-injection -- relying on nodeId being a UUID
    const blockPath = maybePipelineMap?.[nodeId]?.path;
    const blockAnnotations = blockPath
      ? getBlockAnnotations(blockPath, annotations)
      : [];

    contentProps = {
      icon: <BrickIcon brick={brick} size="2x" inheritColor />,
      runStatus: decideBlockStatus({
        traceRecord,
        blockAnnotations,
      }),
      brickLabel: isNullOrBlank(brickConfig.label)
        ? brick?.name
        : brickConfig.label,
      outputKey: expanded ? undefined : brickConfig.outputKey,
    };
  }

  const restBrickNodeProps: Except<
    BrickNodeProps,
    keyof BrickNodeContentProps
  > = {
    onClickMoveUp,
    onClickMoveDown,
    onClick,
    active: nodeIsActive,
    onHoverChange,
    parentIsActive,
    nestingLevel,
    hasSubPipelines,
    collapsed,
    nodeActions: expanded ? [] : brickNodeActions,
    showBiggerActions,
    trailingMessage,
  };

  nodes.push({
    type: "brick",
    key: brickConfig.instanceId,
    ...contentProps,
    ...restBrickNodeProps,
  });

  if (expanded) {
    for (const {
      headerLabel,
      pipeline,
      path,
      flavor,
      inputKey,
    } of subPipelines) {
      const headerName = `${nodeId}-header`;
      const fullSubPath = joinPathParts(pipelinePath, index, path);
      const nodePreviewElementId = getNodePreviewElementId(brickConfig, path);

      const headerActions: NodeAction[] = [
        {
          name: `${headerName}-add-brick`,
          icon: faPlusCircle,
          tooltipText: "Add a brick",
          onClick() {
            dispatch(
              actions.showAddBlockModal({
                path: fullSubPath,
                flavor,
                index: 0,
              })
            );
          },
        },
      ];

      if (showPaste) {
        headerActions.push({
          name: `${headerName}-paste-brick`,
          icon: faPaste,
          tooltipText: "Paste copied brick",
          async onClick() {
            await pasteBlock(fullSubPath, 0);
          },
        });
      }

      // window.removeEventListener(
      //   `${SCROLL_TO_HEADER_NODE_EVENT}-${nodePreviewElementId}`,
      //   expandParentNode
      // );
      // window.addEventListener(
      //   `${SCROLL_TO_HEADER_NODE_EVENT}-${nodePreviewElementId}`,
      //   expandParentNode
      // );

      const headerNodeProps: PipelineHeaderNodeProps = {
        headerLabel,
        nestingLevel,
        nodeActions: headerActions,
        pipelineInputKey: inputKey,
        active: nodeIsActive,
        nestedActive: parentIsActive,
        expandParentNode,
        nodePreviewElement: nodePreviewElementId
          ? {
              name: nodePreviewElementId,
              focus() {
                setActiveNodeId(brickConfig.instanceId);
                dispatch(
                  editorActions.setNodePreviewActiveElement(
                    nodePreviewElementId
                  )
                );
                window.dispatchEvent(
                  new Event(
                    `${SCROLL_TO_DOCUMENT_PREVIEW_ELEMENT_EVENT}-${nodePreviewElementId}`
                  )
                );
              },
              active: nodePreviewElementId === activeNodePreviewElementId,
            }
          : null,
        isPipelineLoading: isLoading,
      };

      const {
        nodes: subPipelineNodes,
        extensionHasTraces: subPipelineHasTraces,
      } = mapPipelineToNodes({
        pipeline,
        flavor,
        pipelinePath: fullSubPath,
        nestingLevel: nestingLevel + 1,
        parentIsActive: nodeIsActive || parentIsActive,
      });

      nodes.push(
        {
          type: "header",
          key: fullSubPath,
          ...headerNodeProps,
        },
        ...subPipelineNodes
      );

      extensionHasTraces = extensionHasTraces || subPipelineHasTraces;
    }

    const footerNodeProps: PipelineFooterNodeProps = {
      outputKey: brickConfig.outputKey,
      nodeActions: brickNodeActions,
      showBiggerActions,
      trailingMessage,
      nestingLevel,
      active: nodeIsActive,
      nestedActive: parentIsActive,
      hovered,
      onHoverChange,
      onClick,
    };
    nodes.push({
      type: "footer",
      key: `${brickConfig.instanceId}-footer`,
      ...footerNodeProps,
    });
  }

  return {
    nodes,
    extensionHasTraces,
  };
}
