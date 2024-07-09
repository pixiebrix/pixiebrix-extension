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

import React, { useState } from "react";
import {
  type BrickNodeContentProps,
  type BrickNodeProps,
} from "@/pageEditor/tabs/editTab/editTabTypes";
import { type PipelineHeaderNodeProps } from "@/pageEditor/tabs/editTab/editorNodes/PipelineHeaderNode";
import { type PipelineFooterNodeProps } from "@/pageEditor/tabs/editTab/editorNodes/PipelineFooterNode";
import { PIPELINE_BRICKS_FIELD_NAME } from "@/pageEditor/consts";
import {
  type BrickConfig,
  type BrickPipeline,
  PipelineFlavor,
} from "@/bricks/types";
import {
  filterTracesByCall,
  getLatestBrickCall,
} from "@/telemetry/traceHelpers";
import { DocumentRenderer } from "@/bricks/renderers/document";
import {
  getDocumentBuilderPipelinePaths,
  filterStarterBrickAnalysisAnnotations,
  getVariableKeyForSubPipeline,
  getPipelinePropNames,
  filterAnnotationsByBrickPath,
} from "@/pageEditor/utils";
import { get, isEmpty } from "lodash";
import {
  type DocumentBuilderElement,
  isButtonElement,
} from "@/pageEditor/documentBuilder/documentBuilderTypes";
import { type NodeAction } from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/NodeActionsView";
import { faPaste, faPlusCircle } from "@fortawesome/free-solid-svg-icons";
import {
  actions,
  actions as editorActions,
} from "@/pageEditor/store/editor/editorSlice";
import PackageIcon from "@/components/PackageIcon";
import {
  decideBlockStatus,
  decideFoundationStatus,
} from "@/pageEditor/tabs/editTab/editorNodeLayout/decideStatus";
import { type Except } from "type-fest";
import useAllBricks from "@/bricks/hooks/useAllBricks";
import { useDispatch, useSelector } from "react-redux";
import { selectActiveModComponentTraces } from "@/pageEditor/store/runtime/runtimeSelectors";
import {
  selectActiveModComponentFormState,
  selectActiveNodeId,
  selectCollapsedNodes,
  selectActiveBuilderPreviewElement,
  selectPipelineMap,
} from "@/pageEditor/store/editor/editorSelectors";
import { getRootPipelineFlavor } from "@/bricks/brickFilterHelpers";
import { FOUNDATION_NODE_ID } from "@/pageEditor/store/editor/uiState";
import { type Branch, type OutputKey } from "@/types/runtimeTypes";
import { type UUID } from "@/types/stringTypes";
import useApiVersionAtLeast from "@/pageEditor/hooks/useApiVersionAtLeast";
import { selectModComponentAnnotations } from "@/analysis/analysisSelectors";
import usePasteBrick from "@/pageEditor/tabs/editTab/editorNodeLayout/usePasteBrick";
import { type IconProp } from "@fortawesome/fontawesome-svg-core";
import { ADAPTERS } from "@/pageEditor/starterBricks/adapter";
import { type Brick } from "@/types/brickTypes";
import { isNullOrBlank } from "@/utils/stringUtils";
import { joinName, joinPathParts } from "@/utils/formUtils";
import { SCROLL_TO_DOCUMENT_PREVIEW_ELEMENT_EVENT } from "@/pageEditor/documentBuilder/preview/ElementPreview";
import { getBrickPipelineNodeSummary } from "@/pageEditor/tabs/editTab/editorNodeLayout/nodeSummary";
import { BrickTypes } from "@/runtime/runtimeTypes";

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

  pipeline: BrickPipeline;

  /**
   * Formik path to the pipeline
   */
  path: string;

  flavor: PipelineFlavor;

  inputKey?: string;
};

function getBuilderPreviewElementId(
  brickConfig: BrickConfig,
  path: string,
): string | null {
  if (brickConfig.id === DocumentRenderer.BRICK_ID) {
    // The Document Preview element name is a substring of the header node path, e.g.
    // SubPipeline.path: config.body.0.children.9.children.0.children.0.config.onClick.__value__0.children.9.children.0.children.0
    // Document element: 0.children.9.children.0.children.0
    const regex = /config\.body\.(.*)\.config\..*$/;
    const result = regex.exec(path);
    if (result) {
      return result[1];
    }
  }

  return null;
}

/**
 * @param block the block, or null if the resolved block is not available yet
 * @param blockConfig the block config
 */
function getSubPipelinesForBlock(
  block: Brick | null,
  blockConfig: BrickConfig,
): SubPipeline[] {
  const subPipelines: SubPipeline[] = [];
  if (blockConfig.id === DocumentRenderer.BRICK_ID) {
    for (const docPipelinePath of getDocumentBuilderPipelinePaths(
      blockConfig,
    )) {
      const path = joinPathParts(docPipelinePath, "__value__");
      const pipeline: BrickPipeline = get(blockConfig, path) ?? [];

      // Removing the 'config.<pipelinePropName>' from the end of the docPipelinePath
      const elementPathParts = docPipelinePath.split(".").slice(0, -2);
      const docBuilderElement = get(
        blockConfig,
        elementPathParts,
      ) as DocumentBuilderElement;

      const isButton = isButtonElement(docBuilderElement);

      let subPipelineLabel = docBuilderElement.config.label as string;
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
        pipelinePropName,
      );

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
  modComponentHasTraces: boolean;
};

const usePipelineNodes = (): {
  foundationNodeProps: BrickNodeProps;
  nodes: EditorNodeProps[];
} => {
  const dispatch = useDispatch();
  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  const activeNodeId = useSelector(selectActiveNodeId);
  const traces = useSelector(selectActiveModComponentTraces);
  const maybePipelineMap = useSelector(selectPipelineMap);
  const collapsedNodes = useSelector(selectCollapsedNodes);

  const annotations = useSelector(
    selectModComponentAnnotations(activeModComponentFormState.uuid),
  );
  const activeBuilderPreviewElementId = useSelector(
    selectActiveBuilderPreviewElement,
  );

  const isApiAtLeastV2 = useApiVersionAtLeast("v2");

  const { allBricks, isLoading } = useAllBricks();

  const pasteBlock = usePasteBrick();
  const showPaste = pasteBlock && isApiAtLeastV2;

  const starterBrickType = activeModComponentFormState.type;
  const { label: starterBrickLabel, icon: starterBrickIcon } =
    ADAPTERS.get(starterBrickType);
  const rootPipeline = activeModComponentFormState.modComponent.brickPipeline;
  const rootPipelineFlavor = getRootPipelineFlavor(starterBrickType);
  const [hoveredState, setHoveredState] = useState<Record<UUID, boolean>>({});

  const { nodes, modComponentHasTraces } = mapPipelineToNodes({
    pipeline: rootPipeline,
    flavor: rootPipelineFlavor,
  });

  const foundationNodeProps = makeFoundationNode({
    pipelineFlavor: rootPipelineFlavor,
    showBiggerActions: isEmpty(rootPipeline),
    starterBrickLabel,
    starterBrickIcon,
    modComponentHasTraces,
  });

  return {
    foundationNodeProps,
    nodes,
  };

  // Control flow returns above
  //
  // Inner function definitions start here

  function setActiveNodeId(nodeId: UUID) {
    dispatch(actions.setActiveNodeId(nodeId));
  }

  function moveBlockUp(nodeId: UUID) {
    dispatch(
      actions.moveNode({
        nodeId,
        direction: "up",
      }),
    );
  }

  function moveBlockDown(nodeId: UUID) {
    dispatch(
      actions.moveNode({
        nodeId,
        direction: "down",
      }),
    );
  }

  // eslint-disable-next-line complexity -- large number of parameters required to map a block to nodes
  function mapBrickToNodes({
    index,
    blockConfig,
    latestPipelineCall,
    flavor,
    pipelinePath,
    lastIndex,
    isRootPipeline,
    showAppend,
    isParentActive,
    isAncestorActive,
    nestingLevel,
    modComponentHasTraces: modComponentHasTracesInput,
  }: {
    index: number;
    blockConfig: BrickConfig;
    latestPipelineCall: Branch[];
    flavor: PipelineFlavor;
    pipelinePath: string;
    lastIndex: number;
    isRootPipeline: boolean;
    showAppend: boolean;
    isParentActive: boolean;
    isAncestorActive: boolean;
    nestingLevel: number;
    modComponentHasTraces?: boolean;
  }): MapOutput {
    const nodes: EditorNodeProps[] = [];
    const block = allBricks.get(blockConfig.id)?.block;
    const isNodeActive = blockConfig.instanceId === activeNodeId;

    const traceRecord = getLatestBrickCall(
      filterTracesByCall(traces, latestPipelineCall),
      blockConfig.instanceId,
    );

    let modComponentHasTraces =
      modComponentHasTracesInput || traceRecord != null;

    const subPipelines = getSubPipelinesForBlock(block, blockConfig);
    const hasSubPipelines = !isEmpty(subPipelines);
    const collapsed = collapsedNodes.includes(blockConfig.instanceId);
    const expanded = hasSubPipelines && !collapsed;

    const onClick = () => {
      if (activeBuilderPreviewElementId) {
        dispatch(actions.setActiveBuilderPreviewElement(null));

        if (isNodeActive) {
          return;
        }
      }

      if (!isNodeActive) {
        setActiveNodeId(blockConfig.instanceId);
        return;
      }

      if (hasSubPipelines) {
        dispatch(
          actions.toggleCollapseBrickPipelineNode(blockConfig.instanceId),
        );
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
            }),
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
        ? filterAnnotationsByBrickPath(annotations, blockPath)
        : [];

      contentProps = {
        icon: <PackageIcon packageOrMetadata={block} size="2x" inheritColor />,
        runStatus: decideBlockStatus({
          traceRecord,
          blockAnnotations,
        }),
        brickLabel: isNullOrBlank(blockConfig.label)
          ? block?.name
          : blockConfig.label,
        brickSummary: getBrickPipelineNodeSummary(blockConfig),
        outputKey: expanded ? undefined : blockConfig.outputKey,
      };
    }

    const isSubPipelineHeaderActive =
      activeBuilderPreviewElementId == null
        ? false
        : subPipelines.some(
            ({ path }) =>
              activeBuilderPreviewElementId ===
              getBuilderPreviewElementId(blockConfig, path),
          );

    const restBrickNodeProps: Except<
      BrickNodeProps,
      keyof BrickNodeContentProps
    > = {
      onClickMoveUp,
      onClickMoveDown,
      onClick,
      active: !isSubPipelineHeaderActive && isNodeActive,
      onHoverChange,
      isParentActive,
      nestingLevel,
      hasSubPipelines,
      collapsed,
      nodeActions: expanded ? [] : brickNodeActions,
      showBiggerActions,
      trailingMessage,
      isSubPipelineHeaderActive,
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
        const builderPreviewElementId = getBuilderPreviewElementId(
          blockConfig,
          path,
        );
        const isHeaderNodeActive =
          activeBuilderPreviewElementId &&
          builderPreviewElementId === activeBuilderPreviewElementId;
        const isSiblingHeaderActive = isSubPipelineHeaderActive;

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
                }),
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
          active: isHeaderNodeActive,
          isParentActive: !isSiblingHeaderActive && isNodeActive,
          isAncestorActive: !isSiblingHeaderActive && isParentActive,
          builderPreviewElement: builderPreviewElementId
            ? {
                name: builderPreviewElementId,
                focus() {
                  setActiveNodeId(blockConfig.instanceId);
                  dispatch(
                    editorActions.setActiveBuilderPreviewElement(
                      builderPreviewElementId,
                    ),
                  );
                  window.dispatchEvent(
                    new Event(
                      `${SCROLL_TO_DOCUMENT_PREVIEW_ELEMENT_EVENT}-${builderPreviewElementId}`,
                    ),
                  );
                },
                active:
                  builderPreviewElementId === activeBuilderPreviewElementId,
              }
            : null,
          isPipelineLoading: isLoading,
        };

        const {
          nodes: subPipelineNodes,
          modComponentHasTraces: subPipelineHasTraces,
        } = mapPipelineToNodes({
          pipeline,
          flavor,
          pipelinePath: fullSubPath,
          nestingLevel: nestingLevel + 1,
          isParentActive: isSiblingHeaderActive
            ? isHeaderNodeActive
            : isNodeActive || isParentActive,
          isAncestorActive: isSiblingHeaderActive
            ? isHeaderNodeActive
            : isParentActive || isAncestorActive,
          // If this pipeline is a sub-pipeline that doesn't have traces yet, fall back to the latest parent call
          // That prevents deeply nested stale traces from appearing in the UI
          latestParentCall: traceRecord?.branches ?? latestPipelineCall,
        });

        nodes.push(
          {
            type: "header",
            key: fullSubPath,
            ...headerNodeProps,
          },
          ...subPipelineNodes,
        );

        modComponentHasTraces ||= subPipelineHasTraces;
      }

      const footerNodeProps: PipelineFooterNodeProps = {
        outputKey: blockConfig.outputKey,
        nodeActions: brickNodeActions,
        showBiggerActions,
        trailingMessage,
        nestingLevel,
        active: !isSubPipelineHeaderActive && isNodeActive,
        nestedActive: isParentActive,
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
      modComponentHasTraces,
    };
  }

  function mapPipelineToNodes({
    pipeline,
    flavor,
    pipelinePath = PIPELINE_BRICKS_FIELD_NAME,
    nestingLevel = 0,
    isParentActive = false,
    isAncestorActive = false,
    latestParentCall,
  }: {
    pipeline: BrickPipeline;
    flavor: PipelineFlavor;
    pipelinePath?: string;
    nestingLevel?: number;
    isParentActive?: boolean;
    isAncestorActive?: boolean;
    /**
     * The trace record of the current/most recent parent brick call. Used to exclude sub-pipeline brick traces
     * from stale runs.
     *
     * @since 1.8.4
     */
    latestParentCall?: Branch[];
  }): MapOutput {
    const isRootPipeline = pipelinePath === PIPELINE_BRICKS_FIELD_NAME;
    const lastIndex = pipeline.length - 1;
    const lastBlockId = pipeline.at(lastIndex)?.id;
    const lastBlock = lastBlockId ? allBricks.get(lastBlockId) : undefined;
    const showAppend =
      !lastBlock?.block || lastBlock.type !== BrickTypes.RENDERER;
    const nodes: EditorNodeProps[] = [];

    // Determine which execution of the pipeline to show. Currently, getting the latest execution
    let latestPipelineCall: Branch[] | null;
    if (pipeline.length > 0) {
      // Pass [] as default to include all traces
      const latestTraces = filterTracesByCall(traces, latestParentCall ?? []);
      // Use first block in pipeline to determine the latest run
      latestPipelineCall = getLatestBrickCall(
        latestTraces,
        pipeline[0].instanceId,
      )?.branches;
    }

    let modComponentHasTraces = false;

    for (const [index, blockConfig] of pipeline.entries()) {
      const {
        nodes: blockNodes,
        modComponentHasTraces: modComponentHasTracesOut,
      } = mapBrickToNodes({
        index,
        blockConfig,
        latestPipelineCall,
        flavor,
        pipelinePath,
        lastIndex,
        isRootPipeline,
        showAppend,
        isParentActive,
        isAncestorActive,
        nestingLevel,
        modComponentHasTraces,
      });
      nodes.push(...blockNodes);
      modComponentHasTraces ||= modComponentHasTracesOut;
    }

    return {
      nodes,
      modComponentHasTraces,
    };
  }

  function makeFoundationNode({
    pipelineFlavor,
    showBiggerActions,
    starterBrickLabel,
    starterBrickIcon,
    modComponentHasTraces,
  }: {
    pipelineFlavor: PipelineFlavor;
    showBiggerActions: boolean;
    starterBrickLabel: string;
    starterBrickIcon: IconProp;
    modComponentHasTraces: boolean;
  }): BrickNodeProps {
    const foundationNodeActions: NodeAction[] = [
      {
        name: `${FOUNDATION_NODE_ID}-add-brick`,
        icon: faPlusCircle,
        tooltipText: "Add a brick",
        onClick() {
          dispatch(
            actions.showAddBlockModal({
              path: PIPELINE_BRICKS_FIELD_NAME,
              flavor: pipelineFlavor,
              index: 0,
            }),
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
          await pasteBlock(PIPELINE_BRICKS_FIELD_NAME, 0);
        },
      });
    }

    return {
      icon: starterBrickIcon,
      runStatus: decideFoundationStatus({
        hasTraces: modComponentHasTraces,
        blockAnnotations: filterStarterBrickAnalysisAnnotations(annotations),
      }),
      brickLabel: starterBrickLabel,
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
