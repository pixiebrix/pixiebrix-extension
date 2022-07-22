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

import React, { useCallback, useState } from "react";
import { ListGroup } from "react-bootstrap";
import BrickNode from "@/pageEditor/tabs/editTab/editorNodes/brickNode/BrickNode";
import PipelineHeaderNode, {
  PipelineHeaderNodeProps,
} from "@/pageEditor/tabs/editTab/editorNodes/PipelineHeaderNode";
import PipelineFooterNode, {
  PipelineFooterNodeProps,
} from "@/pageEditor/tabs/editTab/editorNodes/PipelineFooterNode";
import { BlockPipeline, Branch } from "@/blocks/types";
import {
  BrickNodeContentProps,
  BrickNodeProps,
  RunStatus,
} from "@/pageEditor/tabs/editTab/editTabTypes";
import { TraceRecord } from "@/telemetry/trace";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { OutputKey, UUID } from "@/core";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensionTrace } from "@/pageEditor/slices/runtimeSelectors";
import { actions } from "@/pageEditor/slices/editorSlice";
import {
  selectActiveElement,
  selectActiveNodeId,
  selectErrorMap,
} from "@/pageEditor/slices/editorSelectors";
import useApiVersionAtLeast from "@/pageEditor/hooks/useApiVersionAtLeast";
import { get, isEmpty } from "lodash";
import { DocumentRenderer } from "@/blocks/renderers/document";
import {
  getDocumentPipelinePaths,
  getPipelinePropNames,
} from "@/pageEditor/utils";
import { isNullOrBlank, joinName, joinPathParts } from "@/utils";
import { NodeAction } from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/NodeActionsView";
import BrickIcon from "@/components/BrickIcon";
import { Except } from "type-fest";
import { FOUNDATION_NODE_ID } from "@/pageEditor/uiState/uiState";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";
import { filterTracesByCall, getLatestCall } from "@/telemetry/traceHelpers";
import useAllBlocks from "@/pageEditor/hooks/useAllBlocks";
import { BlockError, ErrorLevel } from "@/pageEditor/uiState/uiStateTypes";
import { faPaste, faPlusCircle } from "@fortawesome/free-solid-svg-icons";
import { PipelineFlavor } from "@/pageEditor/pageEditorTypes";
import { getRootPipelineFlavor } from "@/pageEditor/tabs/editTab/blockFilterHelpers";

const ADD_MESSAGE = "Add more bricks with the plus button";

type EditorNodeProps =
  | (BrickNodeProps & { type: "brick"; key: string })
  | (PipelineHeaderNodeProps & { type: "header"; key: string })
  | (PipelineFooterNodeProps & { type: "footer"; key: string });

type EditorNodeLayoutProps = {
  pipeline: BlockPipeline;
  extensionPointLabel: string;
  extensionPointIcon: IconProp;
  moveBlockUp: (instanceId: UUID) => void;
  moveBlockDown: (instanceId: UUID) => void;
  pasteBlock?: (pipelinePath: string, pipelineIndex: number) => void;
};

type SubPipeline = {
  /**
   * Label to show in the node layout
   */
  headerLabel: string;

  subPipeline: BlockPipeline;

  /**
   * Formik path to the pipeline
   */
  subPipelinePath: string;

  subPipelineFlavor: PipelineFlavor;
};

function decideBlockStatus(
  blockError: BlockError,
  traceRecord: TraceRecord
): RunStatus {
  // TODO: check analysis annotations for error status
  if (
    blockError != null &&
    (blockError.errors?.some((error) => error.level === ErrorLevel.Critical) ||
      blockError?.fieldErrors)
  ) {
    return RunStatus.ERROR;
  }

  if (blockError?.errors?.some((error) => error.level === ErrorLevel.Warning)) {
    return RunStatus.WARNING;
  }

  if (traceRecord == null) {
    return RunStatus.NONE;
  }

  if (traceRecord?.skippedRun) {
    return RunStatus.SKIPPED;
  }

  if (traceRecord.isFinal) {
    return RunStatus.SUCCESS;
  }

  return RunStatus.PENDING;
}

const EditorNodeLayout: React.FC<EditorNodeLayoutProps> = ({
  pipeline,
  extensionPointLabel,
  extensionPointIcon,
  moveBlockUp,
  moveBlockDown,
  pasteBlock,
}) => {
  const dispatch = useDispatch();
  const isApiAtLeastV2 = useApiVersionAtLeast("v2");
  const showPaste = pasteBlock && isApiAtLeastV2;
  const [allBlocks] = useAllBlocks();
  const activeNodeId = useSelector(selectActiveNodeId);
  const traces = useSelector(selectExtensionTrace);
  const errors = useSelector(selectErrorMap);
  const activeElement = useSelector(selectActiveElement);
  const extensionPointType = activeElement.extensionPoint.definition.type;

  const [collapsedState, setCollapsedState] = useState<Record<UUID, boolean>>(
    {}
  );
  const [hoveredState, setHoveredState] = useState<Record<UUID, boolean>>({});

  const setActiveNodeId = useCallback(
    (nodeId: UUID) => {
      dispatch(actions.setElementActiveNodeId(nodeId));
    },
    [dispatch]
  );

  let foundationRunStatus: RunStatus = RunStatus.NONE;

  // eslint-disable-next-line complexity
  function mapPipelineToNodes({
    pipeline,
    pipelinePath = PIPELINE_BLOCKS_FIELD_NAME,
    pipelineFlavor,
    nestingLevel = 0,
    parentIsActive = false,
  }: {
    pipeline: BlockPipeline;
    pipelinePath?: string;
    nestingLevel?: number;
    parentIsActive?: boolean;
    pipelineFlavor?: PipelineFlavor;
  }): EditorNodeProps[] {
    const isRootPipeline = pipelinePath === PIPELINE_BLOCKS_FIELD_NAME;

    const lastIndex = pipeline.length - 1;
    // eslint-disable-next-line security/detect-object-injection -- just created the index
    const lastBlockId = pipeline[lastIndex]?.id;
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

    for (const [index, blockConfig] of pipeline.entries()) {
      const subPipelines: SubPipeline[] = [];
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

      if (traceRecord != null) {
        // The runtime doesn't directly trace the extension point. However, if there's a trace from a brick, we
        // know the extension point ran successfully
        foundationRunStatus = RunStatus.SUCCESS;
      }

      if (blockConfig.id === DocumentRenderer.BLOCK_ID) {
        for (const docPipelinePath of getDocumentPipelinePaths(blockConfig)) {
          const subPipelineAccessor = joinPathParts(
            String(index),
            docPipelinePath,
            "__value__"
          );
          const subPipelinePath = joinPathParts(
            pipelinePath,
            subPipelineAccessor
          );
          const subPipeline: BlockPipeline =
            get(pipeline, subPipelineAccessor) ?? [];
          const propName = docPipelinePath.split(".").pop();
          const isButton = propName === "onClick";
          subPipelines.push({
            headerLabel: isButton ? "button" : "brick",
            subPipeline,
            subPipelinePath,
            subPipelineFlavor: isButton
              ? PipelineFlavor.NoRenderer
              : PipelineFlavor.NoEffect,
          });
        }
      } else {
        for (const propName of getPipelinePropNames(blockConfig)) {
          const subPipelineAccessor = [
            String(index),
            "config",
            propName,
            "__value__",
          ];
          const subPipelinePath = joinName(
            pipelinePath,
            ...subPipelineAccessor
          );
          subPipelines.push({
            headerLabel: propName,
            subPipeline: get(pipeline, subPipelineAccessor) ?? [],
            subPipelinePath,
            subPipelineFlavor: PipelineFlavor.NoRenderer,
          });
        }
      }

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
      // so, "up" is lower in the array, and "down" is higher in the array.
      // Also, you cannot move the foundation node, which is always at
      // index 0.
      const canMoveUp = index > 0;
      const canModeDown = index < lastIndex;

      const onClickMoveUp = canMoveUp
        ? () => {
            moveBlockUp(blockConfig.instanceId);
          }
        : undefined;
      const onClickMoveDown = canModeDown
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
                flavor: pipelineFlavor,
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
          onClick() {
            pasteBlock(pipelinePath, index + 1);
          },
        });
      }

      const trailingMessage = showAddMessage ? ADD_MESSAGE : undefined;

      let contentProps: BrickNodeContentProps = {
        brickLabel: "Loading...",
      };

      if (block) {
        const blockError = errors[nodeId];

        contentProps = {
          icon: <BrickIcon brick={block} size="2x" inheritColor />,
          runStatus: decideBlockStatus(blockError, traceRecord),
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
          subPipeline,
          subPipelinePath,
          subPipelineFlavor,
        } of subPipelines) {
          const headerName = `${nodeId}-header`;

          const headerActions: NodeAction[] = [
            {
              name: `${headerName}-add-brick`,
              icon: faPlusCircle,
              tooltipText: "Add a brick",
              onClick() {
                dispatch(
                  actions.showAddBlockModal({
                    path: subPipelinePath,
                    flavor: subPipelineFlavor,
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
              onClick() {
                pasteBlock(subPipelinePath, 0);
              },
            });
          }

          const headerNodeProps: PipelineHeaderNodeProps = {
            headerLabel,
            nestingLevel,
            nodeActions: headerActions,
            active: nodeIsActive,
            nestedActive: parentIsActive,
          };

          nodes.push(
            {
              type: "header",
              key: subPipelinePath,
              ...headerNodeProps,
            },
            ...mapPipelineToNodes({
              pipeline: subPipeline,
              pipelinePath: subPipelinePath,
              pipelineFlavor: subPipelineFlavor,
              nestingLevel: nestingLevel + 1,
              parentIsActive: nodeIsActive || parentIsActive,
            })
          );
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
    } // End forEach

    return nodes;
  }

  const rootPipelineFlavor = getRootPipelineFlavor(extensionPointType);
  const foundationNodeActions: NodeAction[] = [
    {
      name: `${FOUNDATION_NODE_ID}-add-brick`,
      icon: faPlusCircle,
      tooltipText: "Add a brick",
      onClick() {
        dispatch(
          actions.showAddBlockModal({
            path: PIPELINE_BLOCKS_FIELD_NAME,
            flavor: rootPipelineFlavor,
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
      onClick() {
        pasteBlock(PIPELINE_BLOCKS_FIELD_NAME, 0);
      },
    });
  }

  const showBiggerFoundationActions = isEmpty(pipeline);

  // It's important to run mapPipelineToNodes before adding the foundation node
  // because it will calculate foundationRunStatus for the foundation node
  const nodes = mapPipelineToNodes({
    pipeline,
    pipelineFlavor: rootPipelineFlavor,
  });
  const foundationNodeProps: BrickNodeProps = {
    icon: extensionPointIcon,
    runStatus: foundationRunStatus,
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
    showBiggerActions: showBiggerFoundationActions,
    trailingMessage: showBiggerFoundationActions ? ADD_MESSAGE : undefined,
  };

  return (
    <ListGroup variant="flush">
      <BrickNode key={FOUNDATION_NODE_ID} {...foundationNodeProps} />
      {nodes.map(({ type, key, ...nodeProps }) => {
        switch (type) {
          case "brick": {
            return <BrickNode key={key} {...(nodeProps as BrickNodeProps)} />;
          }

          case "header": {
            return (
              <PipelineHeaderNode
                key={key}
                {...(nodeProps as PipelineHeaderNodeProps)}
              />
            );
          }

          case "footer": {
            return (
              <PipelineFooterNode
                key={key}
                {...(nodeProps as PipelineFooterNodeProps)}
              />
            );
          }

          default: {
            // Impossible code branch
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions -- dynamic check for never
            throw new Error(`Unexpected type: ${type}`);
          }
        }
      })}
    </ListGroup>
  );
};

export default React.memo(EditorNodeLayout);
