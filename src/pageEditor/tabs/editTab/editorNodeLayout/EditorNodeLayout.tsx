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
  FormikError,
  RunStatus,
} from "@/pageEditor/tabs/editTab/editTabTypes";
import { TraceError, TraceRecord } from "@/telemetry/trace";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { TypedBlockMap } from "@/blocks/registry";
import { OutputKey, UUID } from "@/core";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensionTrace } from "@/pageEditor/slices/runtimeSelectors";
import { actions } from "@/pageEditor/slices/editorSlice";
import { selectActiveNodeId } from "@/pageEditor/slices/editorSelectors";
import useApiVersionAtLeast from "@/pageEditor/hooks/useApiVersionAtLeast";
import { get, isEmpty } from "lodash";
import { DocumentRenderer } from "@/blocks/renderers/document";
import {
  getDocumentPipelinePaths,
  getPipelinePropNames,
} from "@/pageEditor/utils";
import { joinElementName } from "@/components/documentBuilder/utils";
import { isNullOrBlank, joinName } from "@/utils";
import { NodeAction } from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/NodeActionsView";
import BrickIcon from "@/components/BrickIcon";
import { Except } from "type-fest";
import { FOUNDATION_NODE_ID } from "@/pageEditor/uiState/uiState";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";
import { filterTracesByCall, getLatestCall } from "@/telemetry/traceHelpers";
import { faPaste, faPlusCircle } from "@fortawesome/free-solid-svg-icons";
import { PipelineType } from "@/pageEditor/pageEditorTypes";

const ADD_MESSAGE = "Add more bricks with the plus button";

type EditorNodeProps =
  | (BrickNodeProps & { type: "brick"; key: string })
  | (PipelineHeaderNodeProps & { type: "header"; key: string })
  | (PipelineFooterNodeProps & { type: "footer"; key: string });

type EditorNodeLayoutProps = {
  allBlocks: TypedBlockMap;
  pipeline: BlockPipeline;
  pipelineErrors: FormikError;
  traceErrors: TraceError[];
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
  /**
   * The pipeline of blocks
   */
  subPipeline: BlockPipeline;
  /**
   * Formik path to the pipeline
   */
  subPipelinePath: string;
  /**
   * The pipeline type
   */
  subPipelineType: PipelineType;
};

function decideBrickStatus({
  index,
  pipelineErrors,
  traceRecord,
}: {
  index: number;
  pipelineErrors: FormikError;
  traceRecord: TraceRecord;
}): RunStatus {
  // If blockPipelineErrors is a string, it means the error is on the pipeline level
  // eslint-disable-next-line security/detect-object-injection -- index is a number
  if (typeof pipelineErrors !== "string" && Boolean(pipelineErrors?.[index])) {
    return RunStatus.ERROR;
  }

  if (traceRecord == null) {
    return RunStatus.NONE;
  }

  if ("error" in traceRecord && traceRecord.error) {
    return RunStatus.WARNING;
  }

  if (traceRecord?.skippedRun) {
    return RunStatus.SKIPPED;
  }

  // We already checked for errors from pipelineErrors
  if (traceRecord.isFinal) {
    return RunStatus.SUCCESS;
  }

  return RunStatus.PENDING;
}

const EditorNodeLayout: React.FC<EditorNodeLayoutProps> = ({
  allBlocks,
  pipeline,
  pipelineErrors,
  extensionPointLabel,
  extensionPointIcon,
  moveBlockUp,
  moveBlockDown,
  pasteBlock,
}) => {
  const dispatch = useDispatch();
  const isApiAtLeastV2 = useApiVersionAtLeast("v2");
  const showPaste = pasteBlock && isApiAtLeastV2;
  const activeNodeId = useSelector(selectActiveNodeId);
  const traces = useSelector(selectExtensionTrace);

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

  function mapPipelineToNodes({
    pipeline,
    pipelinePath = PIPELINE_BLOCKS_FIELD_NAME,
    pipelineType = PipelineType.Root,
    nestingLevel = 0,
    parentIsActive = false,
  }: {
    pipeline: BlockPipeline;
    pipelinePath?: string;
    nestingLevel?: number;
    parentIsActive?: boolean;
    pipelineType?: PipelineType;
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
          const subPipelineAccessor = joinElementName(
            String(index),
            docPipelinePath,
            "__value__"
          );
          const subPipelinePath = joinElementName(
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
            subPipelineType: PipelineType.DocumentBuilder,
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
            subPipelineType: PipelineType.ControlFlow,
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
      const nodeName: string = blockConfig.instanceId;

      // TODO: Refactoring - remove code duplication in the node actions here
      if (showAddBlock) {
        brickNodeActions.push({
          name: `${nodeName}-add-brick`,
          icon: faPlusCircle,
          tooltipText: "Add a brick",
          onClick() {
            dispatch(
              actions.showAddBlockModal({
                path: pipelinePath,
                type: pipelineType,
                index: index + 1,
              })
            );
          },
        });
      }

      if (showPaste) {
        brickNodeActions.push({
          name: `${nodeName}-paste-brick`,
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
        contentProps = {
          icon: <BrickIcon brick={block} size="2x" inheritColor />,
          runStatus: decideBrickStatus({
            index,
            pipelineErrors,
            traceRecord,
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
          subPipeline,
          subPipelinePath,
          subPipelineType,
        } of subPipelines) {
          const headerName = `${nodeName}-header`;

          const headerActions: NodeAction[] = [
            {
              name: `${headerName}-add-brick`,
              icon: faPlusCircle,
              tooltipText: "Add a brick",
              onClick() {
                dispatch(
                  actions.showAddBlockModal({
                    path: subPipelinePath,
                    type: subPipelineType,
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
              pipelineType: subPipelineType,
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

  const foundationNodeActions: NodeAction[] = [
    {
      name: `${FOUNDATION_NODE_ID}-add-brick`,
      icon: faPlusCircle,
      tooltipText: "Add a brick",
      onClick() {
        dispatch(
          actions.showAddBlockModal({
            path: PIPELINE_BLOCKS_FIELD_NAME,
            type: PipelineType.Root,
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
  const nodes = mapPipelineToNodes({ pipeline });
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
