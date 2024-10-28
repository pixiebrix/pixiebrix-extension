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

import React, { useCallback } from "react";
import { type BrickNodeContentProps } from "@/pageEditor/tabs/editTab/editTabTypes";
import { type PipelineFooterNodeProps } from "@/pageEditor/tabs/editTab/editorNodes/PipelineFooterNode";
import { type BrickConfig, type PipelineFlavor } from "@/bricks/types";
import {
  filterTracesByCall,
  getLatestBrickCall,
} from "@/telemetry/traceHelpers";
import { filterAnnotationsByBrickPath } from "@/pageEditor/utils";
import { isEmpty } from "lodash";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { decideBrickStatus } from "@/pageEditor/tabs/editTab/editorNodeLayout/decideStatus";
import { type Branch } from "@/types/runtimeTypes";
import { isNullOrBlank } from "@/utils/stringUtils";
import { getBrickPipelineNodeSummary } from "@/pageEditor/tabs/editTab/editorNodeLayout/nodeSummary";
import { assertNotNullish } from "@/utils/nullishUtils";
import {
  type MapOutput,
  type EditorNodeProps,
} from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/types";
import {
  getBuilderPreviewElementId,
  getSubPipelinesForBrick,
} from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/helpers";
import { type AppDispatch } from "@/pageEditor/store/store";
import {
  selectActiveBuilderPreviewElement,
  selectActiveModComponentFormState,
  selectActiveNodeId,
  selectCollapsedNodes,
  selectPipelineMap,
} from "@/pageEditor/store/editor/editorSelectors";
import { selectActiveModComponentTraces } from "@/pageEditor/store/runtime/runtimeSelectors";
import { selectModComponentAnnotations } from "@/analysis/analysisSelectors";
import PackageIcon from "@/components/PackageIcon";
import { useDispatch, useSelector } from "react-redux";
import useApiVersionAtLeast from "@/pageEditor/hooks/useApiVersionAtLeast";
import useTypedBrickMap from "@/bricks/hooks/useTypedBrickMap";
import { useCreateNodeActions } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useCreateNodeActions";
import { useGetNodeState } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useGetNodeState";
import { useGetSubPipelineNodes } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useGetSubPipelineNodes";
import { useGetBrickContentProps } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useGetBrickContentProps";

export type MapBrickToNodesArgs = {
  index: number;
  brickConfig: BrickConfig;
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
};

export function useMapBrickToNodes(): (args: MapBrickToNodesArgs) => MapOutput {
  const dispatch = useDispatch<AppDispatch>();
  const isApiAtLeastV2 = useApiVersionAtLeast("v2");
  const createNodeActions = useCreateNodeActions();
  const getNodeState = useGetNodeState();
  const getSubPiplineNodes = useGetSubPipelineNodes(useMapBrickToNodes());
  const getBrickContentProps = useGetBrickContentProps();
  const { data: allBricks } = useTypedBrickMap();

  const activeModComponentFormState = useSelector(
    selectActiveModComponentFormState,
  );
  assertNotNullish(
    activeModComponentFormState,
    "activeModComponentFormState is required",
  );

  const activeNodeId = useSelector(selectActiveNodeId);
  const traces = useSelector(selectActiveModComponentTraces);
  const collapsedNodes = useSelector(selectCollapsedNodes);
  const activeBuilderPreviewElementId = useSelector(
    selectActiveBuilderPreviewElement,
  );
  const maybePipelineMap = useSelector(selectPipelineMap);
  const annotations = useSelector(
    selectModComponentAnnotations(activeModComponentFormState.uuid),
  );

  return useCallback(
    ({
      index,
      brickConfig,
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
    }: MapBrickToNodesArgs) => {
      const { instanceId } = brickConfig;
      assertNotNullish(instanceId, "instanceId is required");

      const nodes: EditorNodeProps[] = [];
      const brick = allBricks?.get(brickConfig.id)?.block;
      const isNodeActive = instanceId === activeNodeId;

      const traceRecord = getLatestBrickCall(
        filterTracesByCall(traces, latestPipelineCall),
        instanceId,
      );

      let modComponentHasTraces =
        modComponentHasTracesInput || traceRecord != null;

      const subPipelines = getSubPipelinesForBrick(brick, brickConfig);
      const hasSubPipelines = !isEmpty(subPipelines);
      const collapsed = collapsedNodes.includes(instanceId);
      const expanded = hasSubPipelines && !collapsed;

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
            dispatch(
              actions.moveNode({ nodeId: instanceId, direction: "down" }),
            );
          }
        : undefined;

      const showAddBrick = isApiAtLeastV2 && (index < lastIndex || showAppend);
      const showBiggerActions = index === lastIndex && isRootPipeline;
      const nodeId = instanceId;

      const brickNodeActions = createNodeActions({
        nodeId,
        pipelinePath,
        flavor,
        index: index + 1,
        showAddBrick,
      });

      const contentProps = getBrickContentProps({
        brickConfig,
        traceRecord,
      });

      const isSubPipelineHeaderActive =
        activeBuilderPreviewElementId == null
          ? false
          : subPipelines.some(
              ({ path }) =>
                activeBuilderPreviewElementId ===
                getBuilderPreviewElementId(brickConfig, path),
            );

      const brickNodeState = getNodeState({
        active: !isSubPipelineHeaderActive && isNodeActive,
        nodeId,
        nestingLevel,
        showBiggerActions,
        nodeActions: expanded ? [] : brickNodeActions,
        isParentActive,
      });

      nodes.push({
        type: "brick",
        key: instanceId,
        ...contentProps,
        ...brickNodeState,
        onClickMoveUp,
        onClickMoveDown,
        hasSubPipelines,
        collapsed,
        isSubPipelineHeaderActive,
      });

      if (expanded) {
        const { nodes: subNodes, modComponentHasTraces: subPipelineHasTraces } =
          getSubPiplineNodes({
            index,
            brickConfig,
            pipelinePath,
            nestingLevel,
            isParentActive,
            isAncestorActive,
            traceRecord,
            latestPipelineCall,
            isSubPipelineHeaderActive,
          });

        nodes.push(...subNodes);

        modComponentHasTraces ||= subPipelineHasTraces;

        const footerNodeState = getNodeState({
          active: !isSubPipelineHeaderActive && isNodeActive,
          nodeId: instanceId,
          nestingLevel,
          showBiggerActions,
          nodeActions: brickNodeActions,
        });

        const footerNodeProps: PipelineFooterNodeProps = {
          ...footerNodeState,
          outputKey: brickConfig.outputKey,
          nestedActive: isParentActive,
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
    },
    [
      activeBuilderPreviewElementId,
      activeNodeId,
      allBricks,
      annotations,
      collapsedNodes,
      createNodeActions,
      dispatch,
      getNodeState,
      getSubPiplineNodes,
      isApiAtLeastV2,
      maybePipelineMap,
      traces,
    ],
  );
}
