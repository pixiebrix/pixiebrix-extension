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

import React from "react";
import {
  type BrickNodeContentProps,
  type BrickNodeProps,
} from "@/pageEditor/tabs/editTab/editTabTypes";
import { type PipelineHeaderNodeProps } from "@/pageEditor/tabs/editTab/editorNodes/PipelineHeaderNode";
import { type PipelineFooterNodeProps } from "@/pageEditor/tabs/editTab/editorNodes/PipelineFooterNode";
import { type BrickConfig, type PipelineFlavor } from "@/bricks/types";
import {
  filterTracesByCall,
  getLatestBrickCall,
} from "@/telemetry/traceHelpers";
import { filterAnnotationsByBrickPath } from "@/pageEditor/utils";
import { isEmpty } from "lodash";
import { type NodeAction } from "@/pageEditor/tabs/editTab/editorNodes/nodeActions/NodeActionsView";
import { faPaste, faPlusCircle } from "@fortawesome/free-solid-svg-icons";
import {
  actions,
  actions as editorActions,
} from "@/pageEditor/store/editor/editorSlice";
import { decideBlockStatus } from "@/pageEditor/tabs/editTab/editorNodeLayout/decideStatus";
import { type Except } from "type-fest";
import { type Branch } from "@/types/runtimeTypes";
import { isNullOrBlank } from "@/utils/stringUtils";
import { joinPathParts } from "@/utils/formUtils";
import { SCROLL_TO_DOCUMENT_PREVIEW_ELEMENT_EVENT } from "@/pageEditor/documentBuilder/preview/ElementPreview";
import { getBrickPipelineNodeSummary } from "@/pageEditor/tabs/editTab/editorNodeLayout/nodeSummary";
import { assertNotNullish } from "@/utils/nullishUtils";
import {
  type MapOutput,
  type EditorNodeProps,
} from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/types";
import {
  getBuilderPreviewElementId,
  getSubPipelinesForBlock,
  ADD_MESSAGE,
} from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/helpers";
import { type AppDispatch } from "@/pageEditor/store/store";
import { type TypedBrickMap } from "@/bricks/registry";
import { type RootState } from "@/pageEditor/store/editor/pageEditorTypes";
import {
  selectActiveBuilderPreviewElement,
  selectActiveModComponentFormState,
  selectActiveNodeId,
  selectCollapsedNodes,
  selectPipelineMap,
} from "@/pageEditor/store/editor/editorSelectors";
import { selectActiveModComponentTraces } from "@/pageEditor/store/runtime/runtimeSelectors";
import { type UUID } from "@/types/stringTypes";
import { mapPipelineToNodes } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/mapPipelineToNodes";
import { type Dispatch, type SetStateAction } from "react";
import { selectModComponentAnnotations } from "@/analysis/analysisSelectors";
import PackageIcon from "@/components/PackageIcon";

export function mapBrickToNodes({
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
  allBricks,
  isLoadingBricks,
  hoveredState,
  setHoveredState,
  isApiAtLeastV2,
  pasteBrick,
}: {
  index: number;
  blockConfig: BrickConfig;
  latestPipelineCall: Branch[] | undefined;
  flavor: PipelineFlavor;
  pipelinePath: string;
  lastIndex: number;
  isRootPipeline: boolean;
  showAppend: boolean;
  isParentActive: boolean;
  isAncestorActive: boolean;
  nestingLevel: number;
  modComponentHasTraces?: boolean;
  allBricks?: TypedBrickMap;
  isLoadingBricks: boolean;
  hoveredState: Record<UUID, boolean>;
  setHoveredState: Dispatch<SetStateAction<Record<UUID, boolean>>>;
  isApiAtLeastV2: boolean;
  pasteBrick:
    | ((pipelinePath: string, pipelineIndex: number) => Promise<void>)
    | null;
}) {
  // eslint-disable-next-line complexity -- TODO
  return (dispatch: AppDispatch, getState: () => RootState): MapOutput => {
    const state = getState();
    const activeNodeId = selectActiveNodeId(state);
    const traces = selectActiveModComponentTraces(state);
    const collapsedNodes = selectCollapsedNodes(state);
    const activeBuilderPreviewElementId =
      selectActiveBuilderPreviewElement(state);
    const maybePipelineMap = selectPipelineMap(state);
    const activeModComponentFormState =
      selectActiveModComponentFormState(state);

    assertNotNullish(
      activeModComponentFormState,
      "activeModComponentFormState is required",
    );

    const annotations = selectModComponentAnnotations(
      activeModComponentFormState.uuid,
    )(state);

    const showPaste = pasteBrick && isApiAtLeastV2;

    const { instanceId } = blockConfig;
    assertNotNullish(instanceId, "instanceId is required");

    const nodes: EditorNodeProps[] = [];
    const block = allBricks?.get(blockConfig.id)?.block;
    const isNodeActive = instanceId === activeNodeId;

    const traceRecord = getLatestBrickCall(
      filterTracesByCall(traces, latestPipelineCall),
      instanceId,
    );

    let modComponentHasTraces =
      modComponentHasTracesInput || traceRecord != null;

    const subPipelines = getSubPipelinesForBlock(block, blockConfig);
    const hasSubPipelines = !isEmpty(subPipelines);
    const collapsed = collapsedNodes.includes(instanceId);
    const expanded = hasSubPipelines && !collapsed;

    const onClick = () => {
      if (activeBuilderPreviewElementId) {
        dispatch(actions.setActiveBuilderPreviewElement(null));

        if (isNodeActive) {
          return;
        }
      }

      if (!isNodeActive) {
        dispatch(actions.setActiveNodeId(instanceId));
        return;
      }

      if (hasSubPipelines) {
        dispatch(actions.toggleCollapseBrickPipelineNode(instanceId));
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
          dispatch(actions.moveNode({ nodeId: instanceId, direction: "up" }));
        }
      : undefined;

    const onClickMoveDown = canMoveDown
      ? () => {
          dispatch(actions.moveNode({ nodeId: instanceId, direction: "down" }));
        }
      : undefined;

    const hovered = hoveredState[instanceId];
    const onHoverChange = (hovered: boolean) => {
      setHoveredState((previousState) => ({
        ...previousState,
        [instanceId as string]: hovered,
      }));
    };

    const showAddBrick = isApiAtLeastV2 && (index < lastIndex || showAppend);
    const showBiggerActions = index === lastIndex && isRootPipeline;
    const showAddMessage = showAddBrick && showBiggerActions;

    const brickNodeActions: NodeAction[] = [];
    const nodeId = instanceId;

    // TODO: Refactoring - remove code duplication in the node actions here
    if (showAddBrick) {
      brickNodeActions.push({
        name: `${nodeId}-add-brick`,
        icon: faPlusCircle,
        tooltipText: "Add a brick",
        onClick() {
          dispatch(
            actions.showAddBrickModal({
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
          await pasteBrick(pipelinePath, index + 1);
        },
      });
    }

    const trailingMessage = showAddMessage ? ADD_MESSAGE : undefined;

    let contentProps: BrickNodeContentProps = {
      brickLabel: "Loading...",
    };

    if (block) {
      assertNotNullish(nodeId, "nodeId is required to get brick annotations");
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
          ? block.name
          : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked by isNullOrBlank
            blockConfig.label!,
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
      key: instanceId,
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
                actions.showAddBrickModal({
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
              await pasteBrick(fullSubPath, 0);
            },
          });
        }

        const headerNodeProps: PipelineHeaderNodeProps = {
          headerLabel,
          nestingLevel,
          nodeActions: headerActions,
          pipelineInputKey: inputKey,
          active: isHeaderNodeActive || false,
          isParentActive: !isSiblingHeaderActive && isNodeActive,
          isAncestorActive: !isSiblingHeaderActive && isParentActive,
          builderPreviewElement: builderPreviewElementId
            ? {
                name: builderPreviewElementId,
                focus() {
                  dispatch(actions.setActiveNodeId(instanceId));
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
          isPipelineLoading: isLoadingBricks,
        };

        const {
          nodes: subPipelineNodes,
          modComponentHasTraces: subPipelineHasTraces,
        }: MapOutput = dispatch(
          mapPipelineToNodes({
            traces,
            pipeline,
            flavor,
            pipelinePath: fullSubPath,
            nestingLevel: nestingLevel + 1,
            isParentActive:
              (isSiblingHeaderActive
                ? isHeaderNodeActive
                : isNodeActive || isParentActive) || false,
            isAncestorActive:
              (isSiblingHeaderActive
                ? isHeaderNodeActive
                : isParentActive || isAncestorActive) || false,
            // If this pipeline is a sub-pipeline that doesn't have traces yet, fall back to the latest parent call
            // That prevents deeply nested stale traces from appearing in the UI
            latestParentCall: traceRecord?.branches ?? latestPipelineCall,
            allBricks,
            isLoadingBricks,
            hoveredState,
            setHoveredState,
            isApiAtLeastV2,
            pasteBrick,
          }),
        );

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
        key: `${instanceId}-footer`,
        ...footerNodeProps,
      });
    }

    return {
      nodes,
      modComponentHasTraces,
    };
  };
}
