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
import { TypedBlock, TypedBlockMap } from "@/blocks/registry";
import { IBlock, OutputKey, UUID } from "@/core";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensionTrace } from "@/pageEditor/slices/runtimeSelectors";
import { actions } from "@/pageEditor/slices/editorSlice";
import { selectActiveNodeId } from "@/pageEditor/slices/editorSelectors";
import useApiVersionAtLeast from "@/pageEditor/hooks/useApiVersionAtLeast";
import { get, isEmpty, stubTrue } from "lodash";
import { DocumentRenderer } from "@/blocks/renderers/document";
import {
  getDocumentPipelinePaths,
  getPipelinePropNames,
} from "@/pageEditor/utils";
import { joinElementName } from "@/components/documentBuilder/utils";
import { isNullOrBlank, joinName } from "@/utils";
import { NodeAction } from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/NodeActionsView";
import AddBrickAction from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/AddBrickAction";
import PasteBrickAction from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/PasteBrickAction";
import BrickIcon from "@/components/BrickIcon";
import { Except } from "type-fest";
import { FOUNDATION_NODE_ID } from "@/pageEditor/uiState/uiState";
import { PIPELINE_BLOCKS_FIELD_NAME } from "@/pageEditor/consts";
import { filterTracesByCall, getLatestCall } from "@/telemetry/traceHelpers";
import { ExtensionPointType } from "@/extensionPoints/types";
import {
  IsBlockAllowedPredicate,
  makeIsAllowedForRootPipeline,
} from "@/pageEditor/tabs/editTab/blockFilterHelpers";

const ADD_MESSAGE = "Add more bricks with the plus button";

type EditorNodeProps =
  | (BrickNodeProps & { type: "brick"; key: string })
  | (PipelineHeaderNodeProps & { type: "header"; key: string })
  | (PipelineFooterNodeProps & { type: "footer"; key: string });

type EditorNodeLayoutProps = {
  allBlocks: TypedBlockMap;
  extensionPointType: ExtensionPointType;
  pipeline: BlockPipeline;
  pipelineErrors: FormikError;
  traceErrors: TraceError[];
  extensionPointLabel: string;
  extensionPointIcon: IconProp;
  addBlock: (
    block: IBlock,
    pipelinePath: string,
    pipelineIndex: number
  ) => void;
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
   * Predicate determining if a given block is allowed in the pipeline.
   */
  // In the future, we may want to return a message explaining why the brick isn't allowed
  isBlockAllowed: IsBlockAllowedPredicate;
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
  extensionPointType,
  pipeline,
  pipelineErrors,
  extensionPointLabel,
  extensionPointIcon,
  addBlock,
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
    nestingLevel = 0,
    parentIsActive = false,
    isBlockAllowed = makeIsAllowedForRootPipeline(extensionPointType),
  }: {
    pipeline: BlockPipeline;
    pipelinePath?: string;
    nestingLevel?: number;
    parentIsActive?: boolean;
    isBlockAllowed?: IsBlockAllowedPredicate;
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
            subPipeline,
            subPipelinePath,
            headerLabel: isButton ? "button" : "brick",
            isBlockAllowed: isButton
              ? (block: TypedBlock) => block.type !== "renderer"
              : stubTrue,
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
            // PixieBrix doesn't currently support renderers in control flow bricks
            isBlockAllowed: (block) => block.type !== "renderer",
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

      if (showAddBlock) {
        brickNodeActions.push(
          <AddBrickAction
            key={`${nodeName}-add`}
            blocks={allBlocks}
            isBlockAllowed={isBlockAllowed}
            nodeName={nodeName}
            onSelectBlock={(block) => {
              addBlock(block, pipelinePath, index + 1);
            }}
          />
        );
      }

      if (showPaste) {
        brickNodeActions.push(
          <PasteBrickAction
            key={`${nodeName}-add`}
            nodeName={nodeName}
            onClickPaste={() => {
              pasteBlock(pipelinePath, index + 1);
            }}
          />
        );
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
          isBlockAllowed: isBlockAllowedInPipeline,
        } of subPipelines) {
          const nodeName = `${subPipelinePath}-header`;

          const headerActions: NodeAction[] = [
            <AddBrickAction
              key={nodeName}
              blocks={allBlocks}
              isBlockAllowed={isBlockAllowedInPipeline}
              nodeName={nodeName}
              onSelectBlock={(block) => {
                addBlock(block, subPipelinePath, 0);
              }}
            />,
          ];

          if (showPaste) {
            headerActions.push(
              <PasteBrickAction
                key={nodeName}
                nodeName={nodeName}
                onClickPaste={() => {
                  pasteBlock(subPipelinePath, 0);
                }}
              />
            );
          }

          const headerNodeProps: PipelineHeaderNodeProps = {
            headerLabel,
            nestingLevel,
            nodeActions: headerActions,
            active: nodeIsActive || parentIsActive,
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
              nestingLevel: nestingLevel + 1,
              parentIsActive: nodeIsActive || parentIsActive,
              isBlockAllowed: isBlockAllowedInPipeline,
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
          parentIsActive,
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
    <AddBrickAction
      key={`${FOUNDATION_NODE_ID}-add`}
      blocks={allBlocks}
      isBlockAllowed={makeIsAllowedForRootPipeline(extensionPointType)}
      nodeName={FOUNDATION_NODE_ID}
      onSelectBlock={(block) => {
        addBlock(block, PIPELINE_BLOCKS_FIELD_NAME, 0);
      }}
    />,
  ];

  if (showPaste) {
    foundationNodeActions.push(
      <PasteBrickAction
        key={`${FOUNDATION_NODE_ID}-paste`}
        nodeName={FOUNDATION_NODE_ID}
        onClickPaste={() => {
          pasteBlock(PIPELINE_BLOCKS_FIELD_NAME, 0);
        }}
      />
    );
  }

  const showBiggerFoundationActions = isEmpty(pipeline);

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
      {mapPipelineToNodes({ pipeline }).map(({ type, key, ...nodeProps }) => {
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
