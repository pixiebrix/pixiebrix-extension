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

import React, { useState } from "react";
import {
  BrickNodeContentProps,
  BrickNodeProps,
} from "@/pageEditor/tabs/editTab/editTabTypes";
import { PipelineHeaderNodeProps } from "@/pageEditor/tabs/editTab/editorNodes/PipelineHeaderNode";
import { PipelineFooterNodeProps } from "@/pageEditor/tabs/editTab/editorNodes/PipelineFooterNode";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";
import { BlockConfig, BlockPipeline, Branch } from "@/blocks/types";
import { PipelineFlavor } from "@/pageEditor/pageEditorTypes";
import { filterTracesByCall, getLatestCall } from "@/telemetry/traceHelpers";
import { DocumentRenderer } from "@/blocks/renderers/document";
import {
  getBlockAnnotations,
  getDocumentPipelinePaths,
  getFoundationNodeAnnotations,
  getInputKeyForSubPipeline,
  getPipelinePropNames,
} from "@/pageEditor/utils";
import { isNullOrBlank, joinName, joinPathParts } from "@/utils";
import { get, isEmpty } from "lodash";
import {
  DocumentElement,
  isButtonElement,
} from "@/components/documentBuilder/documentBuilderTypes";
import { NodeAction } from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/NodeActionsView";
import { faPaste, faPlusCircle } from "@fortawesome/free-solid-svg-icons";
import { actions } from "@/pageEditor/slices/editorSlice";
import BrickIcon from "@/components/BrickIcon";
import {
  decideBlockStatus,
  decideFoundationStatus,
} from "@/pageEditor/tabs/editTab/editorNodeLayout/decideStatus";
import { Except } from "type-fest";
import useAllBlocks from "@/blocks/hooks/useAllBlocks";
import { useDispatch, useSelector } from "react-redux";
import { selectActiveElementTraces } from "@/pageEditor/slices/runtimeSelectors";
import {
  selectActiveElement,
  selectActiveNodeId,
  selectPipelineMap,
} from "@/pageEditor/slices/editorSelectors";
import { getRootPipelineFlavor } from "@/blocks/blockFilterHelpers";
import { FOUNDATION_NODE_ID } from "@/pageEditor/uiState/uiState";
import { OutputKey, UUID } from "@/core";
import useApiVersionAtLeast from "@/pageEditor/hooks/useApiVersionAtLeast";
import { selectExtensionAnnotations } from "@/analysis/analysisSelectors";
import usePasteBlock from "@/pageEditor/tabs/editTab/editorNodeLayout/usePasteBlock";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { ADAPTERS } from "@/pageEditor/extensionPoints/adapter";

const ADD_MESSAGE = "Add more bricks with the plus button";

type EditorNodeProps =
  | (BrickNodeProps & { type: "brick"; key: string })
  | (PipelineHeaderNodeProps & { type: "header"; key: string })
  | (PipelineFooterNodeProps & { type: "footer"; key: string });

type SubPipeline = {
  /**
   * Label to show in the node layout
   */
  headerLabel: string;

  pipeline: BlockPipeline;

  /**
   * Formik path to the pipeline
   */
  path: string;

  flavor: PipelineFlavor;

  inputKey?: string;
};

function getSubPipelinesForBlock(blockConfig: BlockConfig): SubPipeline[] {
  const subPipelines: SubPipeline[] = [];
  if (blockConfig.id === DocumentRenderer.BLOCK_ID) {
    for (const docPipelinePath of getDocumentPipelinePaths(blockConfig)) {
      const path = joinPathParts(docPipelinePath, "__value__");
      const pipeline: BlockPipeline = get(blockConfig, path) ?? [];

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
    for (const pipelinePropName of getPipelinePropNames(blockConfig)) {
      const path = joinName("config", pipelinePropName, "__value__");
      const pipeline: BlockPipeline = get(blockConfig, path) ?? [];

      const subPipeline: SubPipeline = {
        headerLabel: pipelinePropName,
        pipeline,
        path,
        flavor: PipelineFlavor.NoRenderer,
      };

      const inputKey = getInputKeyForSubPipeline(blockConfig, pipelinePropName);

      if (inputKey) {
        subPipeline.inputKey = inputKey;
      }

      subPipelines.push(subPipeline);
    }
  }

  return subPipelines;
}

type MapOutput = {
  nodes: EditorNodeProps[];
  extensionHasTraces: boolean;
};

const usePipelineNodes = (): {
  foundationNodeProps: BrickNodeProps;
  nodes: EditorNodeProps[];
} => {
  const dispatch = useDispatch();
  const activeElement = useSelector(selectActiveElement);
  const activeNodeId = useSelector(selectActiveNodeId);
  const traces = useSelector(selectActiveElementTraces);
  const maybePipelineMap = useSelector(selectPipelineMap);
  const annotations = useSelector(
    selectExtensionAnnotations(activeElement.uuid)
  );

  const isApiAtLeastV2 = useApiVersionAtLeast("v2");

  const { allBlocks } = useAllBlocks();

  const pasteBlock = usePasteBlock();
  const showPaste = pasteBlock && isApiAtLeastV2;

  const extensionPointType = activeElement.type;
  const { label: extensionPointLabel, icon: extensionPointIcon } =
    ADAPTERS.get(extensionPointType);
  const rootPipeline = activeElement.extension.blockPipeline;
  const rootPipelineFlavor = getRootPipelineFlavor(extensionPointType);

  const [collapsedState, setCollapsedState] = useState<Record<UUID, boolean>>(
    {}
  );
  const [hoveredState, setHoveredState] = useState<Record<UUID, boolean>>({});

  const { nodes, extensionHasTraces } = mapPipelineToNodes({
    pipeline: rootPipeline,
    flavor: rootPipelineFlavor,
  });

  const foundationNodeProps = makeFoundationNode({
    pipelineFlavor: rootPipelineFlavor,
    showBiggerActions: isEmpty(rootPipeline),
    extensionPointLabel,
    extensionPointIcon,
    extensionHasTraces,
  });

  return {
    foundationNodeProps,
    nodes,
  };

  // Control flow returns above
  //
  // Inner function definitions start here

  function setActiveNodeId(nodeId: UUID) {
    dispatch(actions.setElementActiveNodeId(nodeId));
  }

  function moveBlockUp(nodeId: UUID) {
    dispatch(
      actions.moveNode({
        nodeId,
        direction: "up",
      })
    );
  }

  function moveBlockDown(nodeId: UUID) {
    dispatch(
      actions.moveNode({
        nodeId,
        direction: "down",
      })
    );
  }

  // eslint-disable-next-line complexity
  function mapBlockToNodes({
    index,
    blockConfig,
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
    blockConfig: BlockConfig;
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
    const nodes: EditorNodeProps[] = [];
    const block = allBlocks.get(blockConfig.id)?.block;
    const nodeIsActive = blockConfig.instanceId === activeNodeId;

    const traceRecords = filterTracesByCall(
      traces.filter(
        (trace) => trace.blockInstanceId === blockConfig.instanceId
      ),
      latestPipelineCall
    );

    if (traceRecords.length > 1) {
      console.warn(
        "filterTracesByCall for %s returned multiple trace records",
        blockConfig.instanceId,
        {
          traces,
          instanceId: blockConfig.instanceId,
          lastPipelineCall: latestPipelineCall,
        }
      );
    }

    const traceRecord = traceRecords[0];
    let extensionHasTraces = extensionHasTracesInput;

    if (traceRecord != null) {
      extensionHasTraces = true;
    }

    const subPipelines = getSubPipelinesForBlock(blockConfig);
    const hasSubPipelines = !isEmpty(subPipelines);
    const collapsed = collapsedState[blockConfig.instanceId];
    const expanded = hasSubPipelines && !collapsed;

    const onClick = () => {
      if (nodeIsActive) {
        if (hasSubPipelines) {
          setCollapsedState((previousState) => ({
            ...previousState,
            [blockConfig.instanceId]: !collapsed,
          }));
        }
      } else {
        setActiveNodeId(blockConfig.instanceId);
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
          moveBlockUp(blockConfig.instanceId);
        }
      : undefined;
    const onClickMoveDown = canMoveDown
      ? () => {
          moveBlockDown(blockConfig.instanceId);
        }
      : undefined;

    const hovered = hoveredState[blockConfig.instanceId];
    const onHoverChange = (hovered: boolean) => {
      setHoveredState((previousState) => ({
        ...previousState,
        [blockConfig.instanceId]: hovered,
      }));
    };

    const showAddBlock = isApiAtLeastV2 && (index < lastIndex || showAppend);
    const showBiggerActions = index === lastIndex && isRootPipeline;
    const showAddMessage = showAddBlock && showBiggerActions;

    const brickNodeActions: NodeAction[] = [];
    const nodeId = blockConfig.instanceId;

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

    if (block) {
      // Handle race condition on pipelineMap updates
      // eslint-disable-next-line security/detect-object-injection -- relying on nodeId being a UUID
      const blockPath = maybePipelineMap?.[nodeId]?.path;
      const blockAnnotations = blockPath
        ? getBlockAnnotations(blockPath, annotations)
        : [];

      contentProps = {
        icon: <BrickIcon brick={block} size="2x" inheritColor />,
        runStatus: decideBlockStatus({
          traceRecord,
          blockAnnotations,
        }),
        brickLabel: isNullOrBlank(blockConfig.label)
          ? block?.name
          : blockConfig.label,
        outputKey: expanded ? undefined : blockConfig.outputKey,
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
      key: blockConfig.instanceId,
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

        const headerNodeProps: PipelineHeaderNodeProps = {
          headerLabel,
          nestingLevel,
          nodeActions: headerActions,
          pipelineInputKey: inputKey,
          active: nodeIsActive,
          nestedActive: parentIsActive,
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
        outputKey: blockConfig.outputKey,
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
        key: `${blockConfig.instanceId}-footer`,
        ...footerNodeProps,
      });
    }

    return {
      nodes,
      extensionHasTraces,
    };
  }

  function mapPipelineToNodes({
    pipeline,
    flavor,
    pipelinePath = PIPELINE_BLOCKS_FIELD_NAME,
    nestingLevel = 0,
    parentIsActive = false,
  }: {
    pipeline: BlockPipeline;
    flavor: PipelineFlavor;
    pipelinePath?: string;
    nestingLevel?: number;
    parentIsActive?: boolean;
  }): MapOutput {
    const isRootPipeline = pipelinePath === PIPELINE_BLOCKS_FIELD_NAME;
    const lastIndex = pipeline.length - 1;
    const lastBlockId = pipeline.at(lastIndex)?.id;
    const lastBlock = lastBlockId ? allBlocks.get(lastBlockId) : undefined;
    const showAppend = !lastBlock?.block || lastBlock.type !== "renderer";
    const nodes: EditorNodeProps[] = [];

    // Determine which execution of the pipeline to show. Currently, getting the latest execution
    let latestPipelineCall: Branch[];
    if (pipeline.length > 0) {
      // XXX: there seems to be a bug (race condition) where sometimes this isn't seeing the latest click of a
      // button in the render document brick
      latestPipelineCall = getLatestCall(
        traces.filter(
          // Use first block in pipeline to determine the latest run
          (trace) => trace.blockInstanceId === pipeline[0].instanceId
        )
      )?.branches;
    }

    let extensionHasTraces = false;

    for (const [index, blockConfig] of pipeline.entries()) {
      const { nodes: blockNodes, extensionHasTraces: extensionHasTracesOut } =
        mapBlockToNodes({
          index,
          blockConfig,
          latestPipelineCall,
          flavor,
          pipelinePath,
          lastIndex,
          isRootPipeline,
          showAppend,
          parentIsActive,
          nestingLevel,
          extensionHasTraces,
        });
      nodes.push(...blockNodes);
      extensionHasTraces = extensionHasTraces || extensionHasTracesOut;
    }

    return {
      nodes,
      extensionHasTraces,
    };
  }

  function makeFoundationNode({
    pipelineFlavor,
    showBiggerActions,
    extensionPointLabel,
    extensionPointIcon,
    extensionHasTraces,
  }: {
    pipelineFlavor: PipelineFlavor;
    showBiggerActions: boolean;
    extensionPointLabel: string;
    extensionPointIcon: IconProp;
    extensionHasTraces: boolean;
  }): BrickNodeProps {
    const foundationNodeActions: NodeAction[] = [
      {
        name: `${FOUNDATION_NODE_ID}-add-brick`,
        icon: faPlusCircle,
        tooltipText: "Add a brick",
        onClick() {
          dispatch(
            actions.showAddBlockModal({
              path: PIPELINE_BLOCKS_FIELD_NAME,
              flavor: pipelineFlavor,
              index: 0,
            })
          );
        },
      },
    ];

    if (showPaste) {
      foundationNodeActions.push({
        name: `${FOUNDATION_NODE_ID}-paste-brick`,
        icon: faPaste,
        tooltipText: "Paste copied brick",
        async onClick() {
          await pasteBlock(PIPELINE_BLOCKS_FIELD_NAME, 0);
        },
      });
    }

    return {
      icon: extensionPointIcon,
      runStatus: decideFoundationStatus({
        hasTraces: extensionHasTraces,
        blockAnnotations: getFoundationNodeAnnotations(annotations),
      }),
      brickLabel: extensionPointLabel,
      outputKey: "input" as OutputKey,
      onClick() {
        setActiveNodeId(FOUNDATION_NODE_ID);
      },
      active: activeNodeId === FOUNDATION_NODE_ID,
      onHoverChange(hovered) {
        setHoveredState((previousState) => ({
          ...previousState,
          [FOUNDATION_NODE_ID]: hovered,
        }));
      },
      nestingLevel: 0,
      nodeActions: foundationNodeActions,
      showBiggerActions,
      trailingMessage: showBiggerActions ? ADD_MESSAGE : undefined,
    };
  }
};

export default usePipelineNodes;
