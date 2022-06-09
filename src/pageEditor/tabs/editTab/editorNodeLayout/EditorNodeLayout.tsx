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

import React, { useCallback, useMemo, useState } from "react";
import { ListGroup } from "react-bootstrap";
import BrickNode, {
  BrickNodeProps,
} from "@/pageEditor/tabs/editTab/editorNodes/brickNode/BrickNode";
import PipelineHeaderNode, {
  PipelineHeaderNodeProps,
} from "@/pageEditor/tabs/editTab/editorNodes/PipelineHeaderNode";
import PipelineFooterNode, {
  PipelineFooterNodeProps,
} from "@/pageEditor/tabs/editTab/editorNodes/PipelineFooterNode";
import { BlockPipeline } from "@/blocks/types";
import { FormikError } from "@/pageEditor/tabs/editTab/editTabTypes";
import { TraceError } from "@/telemetry/trace";
import { IconProp } from "@fortawesome/fontawesome-svg-core";
import { TypedBlockMap } from "@/blocks/registry";
import { IBlock, OutputKey, UUID } from "@/core";
import { useDispatch, useSelector } from "react-redux";
import { selectExtensionTrace } from "@/pageEditor/slices/runtimeSelectors";
import {
  BrickNodeContentProps,
  RunStatus,
} from "@/pageEditor/tabs/editTab/editorNodes/brickNode/BrickNodeContent";
import { actions } from "@/pageEditor/slices/editorSlice";
import { selectActiveNodeId } from "@/pageEditor/slices/editorSelectors";
import useApiVersionAtLeast from "@/pageEditor/hooks/useApiVersionAtLeast";
import { get, isEmpty, join } from "lodash";
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

const ADD_MESSAGE = "Add more bricks with the plus button";

const ROOT_PATH = "extension.blockPipeline";

type EditorNodeProps =
  | (BrickNodeProps & { type: "brick"; key: string })
  | (PipelineHeaderNodeProps & { type: "header"; key: string })
  | (PipelineFooterNodeProps & { type: "footer"; key: string });

export type EditorNodeLayoutProps = {
  allBlocks: TypedBlockMap;
  relevantBlocksForRootPipeline: IBlock[];
  pipeline: BlockPipeline;
  pipelineErrors: FormikError;
  errorTraceEntry: TraceError;
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
  headerLabel: string;
  subPipeline: BlockPipeline;
  subPipelinePath: string;
};

const EditorNodeLayout: React.FC<EditorNodeLayoutProps> = ({
  allBlocks,
  relevantBlocksForRootPipeline,
  pipeline,
  pipelineErrors,
  errorTraceEntry,
  extensionPointLabel,
  extensionPointIcon,
  addBlock,
  moveBlockUp,
  moveBlockDown,
  pasteBlock,
}) => {
  const isApiAtLeastV2 = useApiVersionAtLeast("v2");
  const showPaste = pasteBlock && isApiAtLeastV2;
  const activeNodeId = useSelector(selectActiveNodeId);
  const traces = useSelector(selectExtensionTrace);

  const [collapsedState, setCollapsedState] = useState<Record<string, boolean>>(
    {}
  );

  const allBlocksAsRelevant = useMemo(
    () => [...allBlocks.values()].map(({ block }) => block),
    [allBlocks]
  );

  const dispatch = useDispatch();
  const setActiveNodeId = useCallback(
    (nodeId: UUID) => {
      dispatch(actions.setElementActiveNodeId(nodeId));
    },
    [dispatch]
  );

  let foundationRunStatus: RunStatus = RunStatus.NONE;

  function mapPipelineToNodes(
    pipeline: BlockPipeline,
    pipelinePath = ROOT_PATH,
    nestingLevel = 0
  ): EditorNodeProps[] {
    const isRootPipeline = pipelinePath === ROOT_PATH;
    const relevantBlocks = isRootPipeline
      ? relevantBlocksForRootPipeline
      : allBlocksAsRelevant;

    const lastIndex = pipeline.length - 1;
    // eslint-disable-next-line security/detect-object-injection -- just created the index
    const lastBlockId = pipeline[lastIndex]?.id;
    const lastBlock = lastBlockId ? allBlocks.get(lastBlockId) : undefined;
    const showAppend = !lastBlock?.block || lastBlock.type !== "renderer";

    const nodes: EditorNodeProps[] = [];

    for (const [index, blockConfig] of pipeline.entries()) {
      const subPipelines: SubPipeline[] = [];
      const block = allBlocks.get(blockConfig.id)?.block;
      const nodeIsActive = blockConfig.instanceId === activeNodeId;
      const traceRecord = traces.find(
        (trace) => trace.blockInstanceId === blockConfig.instanceId
      );
      if (traceRecord != null) {
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
          const headerLabel = propName === "onClick" ? "button" : "brick";
          subPipelines.push({
            headerLabel,
            subPipeline,
            subPipelinePath,
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
          const subPipeline: BlockPipeline =
            get(pipeline, subPipelineAccessor) ?? [];
          subPipelines.push({
            headerLabel: propName,
            subPipeline,
            subPipelinePath,
          });
        }
      }

      const hasSubPipelines = !isEmpty(subPipelines);
      const collapsedKey = join([pipelinePath, index], ".");
      // eslint-disable-next-line security/detect-object-injection -- constructed key
      const collapsed = collapsedState[collapsedKey];
      const expanded = hasSubPipelines && !collapsed;

      const onClick = () => {
        if (nodeIsActive) {
          if (hasSubPipelines) {
            setCollapsedState((previousState) => ({
              ...previousState,
              [collapsedKey]: !collapsed,
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

      const showAddBlock = isApiAtLeastV2 && (index < lastIndex || showAppend);
      const showBiggerActions = index === lastIndex && isRootPipeline;
      const showAddMessage = showAddBlock && showBiggerActions;

      const brickNodeActions: NodeAction[] = [];
      const nodeName: string = blockConfig.instanceId;

      if (showAddBlock) {
        brickNodeActions.push(
          <AddBrickAction
            key={`${nodeName}-add`}
            relevantBlocksToAdd={relevantBlocks}
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
              pasteBlock(pipelinePath, index);
            }}
          />
        );
      }

      const trailingMessage = showAddMessage ? ADD_MESSAGE : undefined;

      let contentProps: BrickNodeContentProps = {
        brickLabel: "Loading...",
      };

      if (block) {
        const runStatus: RunStatus =
          // If blockPipelineErrors is a string, it means the error is on the pipeline level
          typeof pipelineErrors !== "string" &&
          // eslint-disable-next-line security/detect-object-injection
          Boolean(pipelineErrors?.[index])
            ? RunStatus.ERROR
            : errorTraceEntry?.blockInstanceId === blockConfig.instanceId
            ? RunStatus.WARNING
            : traceRecord?.skippedRun
            ? RunStatus.SKIPPED
            : traceRecord == null
            ? RunStatus.NONE
            : RunStatus.SUCCESS;

        contentProps = {
          icon: <BrickIcon brick={block} size="2x" inheritColor />,
          runStatus,
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
        } of subPipelines) {
          const nodeName = `${subPipelinePath}-header`;

          const headerActions: NodeAction[] = [
            <AddBrickAction
              key={nodeName}
              relevantBlocksToAdd={allBlocksAsRelevant}
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
          };

          nodes.push(
            {
              type: "header",
              key: subPipelinePath,
              ...headerNodeProps,
            },
            ...mapPipelineToNodes(
              subPipeline,
              subPipelinePath,
              nestingLevel + 1
            )
          );
        }

        const footerNodeProps: PipelineFooterNodeProps = {
          outputKey: blockConfig.outputKey,
          nodeActions: brickNodeActions,
          showBiggerActions,
          trailingMessage,
          nestingLevel,
          active: nodeIsActive,
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
      relevantBlocksToAdd={relevantBlocksForRootPipeline}
      nodeName={FOUNDATION_NODE_ID}
      onSelectBlock={(block) => {
        addBlock(block, "", 0);
      }}
    />,
  ];

  if (showPaste) {
    foundationNodeActions.push(
      <PasteBrickAction
        key={`${FOUNDATION_NODE_ID}-paste`}
        nodeName={FOUNDATION_NODE_ID}
        onClickPaste={() => {
          pasteBlock("", 0);
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
    nestingLevel: 0,
    nodeActions: foundationNodeActions,
    showBiggerActions: showBiggerFoundationActions,
    trailingMessage: showBiggerFoundationActions ? ADD_MESSAGE : undefined,
  };

  return (
    <ListGroup variant="flush">
      <BrickNode key={FOUNDATION_NODE_ID} {...foundationNodeProps} />
      {mapPipelineToNodes(pipeline).map(({ type, key, ...nodeProps }) => {
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

          default:
            // Impossible code branch
            return null;
        }
      })}
    </ListGroup>
  );
};

export default React.memo(EditorNodeLayout);
