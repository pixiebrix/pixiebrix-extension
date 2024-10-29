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

import { useCallback } from "react";
import { type PipelineFooterNodeProps } from "@/pageEditor/tabs/editTab/editorNodes/PipelineFooterNode";
import { type BrickConfig, type PipelineFlavor } from "@/bricks/types";
import {
  filterTracesByCall,
  getLatestBrickCall,
} from "@/telemetry/traceHelpers";
import { isEmpty } from "lodash";
import { type Branch } from "@/types/runtimeTypes";
import { assertNotNullish } from "@/utils/nullishUtils";
import {
  type MapOutput,
  type EditorNodeProps,
} from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/types";
import {
  getBuilderPreviewElementId,
  getSubPipelinesForBrick,
} from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/helpers";
import {
  selectActiveBuilderPreviewElement,
  selectActiveModComponentFormState,
  selectActiveNodeId,
  selectCollapsedNodes,
} from "@/pageEditor/store/editor/editorSelectors";
import { selectActiveModComponentTraces } from "@/pageEditor/store/runtime/runtimeSelectors";
import { useSelector } from "react-redux";
import useApiVersionAtLeast from "@/pageEditor/hooks/useApiVersionAtLeast";
import useTypedBrickMap from "@/bricks/hooks/useTypedBrickMap";
import { useCreateNodeActions } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useCreateNodeActions";
import { type useGetNodeState } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useGetNodeState";
import { type useGetSubPipelineNodes } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useGetSubPipelineNodes";
import { useGetBrickContentProps } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useGetBrickContentProps";
import { useGetNodeMovement } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useGetNodeMovement";
import { type useMapPipelineToNodes } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useMapPipelineToNodes";

type BrickNodeContext = {
  isNodeActive: boolean;
  isSubPipelineHeaderActive: boolean;
  showAddBrick: boolean;
  showBiggerActions: boolean;
  hasSubPipelines: boolean;
  collapsed: boolean;
  expanded: boolean;
};

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
  getSubPipelineNodes: ReturnType<typeof useGetSubPipelineNodes>;
  mapPipelineToNodes: ReturnType<typeof useMapPipelineToNodes>;
  getNodeState: ReturnType<typeof useGetNodeState>;
};

export function useMapBrickToNodes(): (args: MapBrickToNodesArgs) => MapOutput {
  const isApiAtLeastV2 = useApiVersionAtLeast("v2");
  const createNodeActions = useCreateNodeActions();
  const getBrickContentProps = useGetBrickContentProps();
  const getNodeMovement = useGetNodeMovement();
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

  const getBrickContext = useCallback(
    ({
      brickConfig,
      index,
      lastIndex,
      isRootPipeline,
      showAppend,
    }: {
      brickConfig: BrickConfig;
      index: number;
      lastIndex: number;
      isRootPipeline: boolean;
      showAppend: boolean;
    }): BrickNodeContext => {
      const { instanceId } = brickConfig;
      assertNotNullish(instanceId, "instanceId is required");

      const brick = allBricks?.get(brickConfig.id)?.block;
      const isNodeActive = instanceId === activeNodeId;

      const subPipelines = getSubPipelinesForBrick(brick, brickConfig);
      const hasSubPipelines = !isEmpty(subPipelines);
      const collapsed = collapsedNodes.includes(instanceId);
      const expanded = hasSubPipelines && !collapsed;

      const showAddBrick = isApiAtLeastV2 && (index < lastIndex || showAppend);
      const showBiggerActions = index === lastIndex && isRootPipeline;

      const isSubPipelineHeaderActive =
        activeBuilderPreviewElementId == null
          ? false
          : subPipelines.some(
              ({ path }) =>
                activeBuilderPreviewElementId ===
                getBuilderPreviewElementId(brickConfig, path),
            );

      return {
        isNodeActive,
        isSubPipelineHeaderActive,
        showAddBrick,
        showBiggerActions,
        hasSubPipelines,
        collapsed,
        expanded,
      };
    },
    [
      activeBuilderPreviewElementId,
      activeNodeId,
      allBricks,
      collapsedNodes,
      isApiAtLeastV2,
    ],
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
      nestingLevel,
      modComponentHasTraces: modComponentHasTracesInput,
      isAncestorActive,
      getSubPipelineNodes,
      mapPipelineToNodes,
      getNodeState,
    }: MapBrickToNodesArgs) => {
      const { instanceId } = brickConfig;
      assertNotNullish(instanceId, "instanceId is required");

      const nodes: EditorNodeProps[] = [];
      let modComponentHasTraces = modComponentHasTracesInput;

      const traceRecord = getLatestBrickCall(
        filterTracesByCall(traces, latestPipelineCall),
        instanceId,
      );
      modComponentHasTraces ||= traceRecord != null;

      const context = getBrickContext({
        brickConfig,
        index,
        lastIndex,
        isRootPipeline,
        showAppend,
      });

      const { onClickMoveUp, onClickMoveDown } = getNodeMovement({
        nodeId: instanceId,
        index,
        lastIndex,
      });

      const nodeId = instanceId;

      const brickNodeActions = createNodeActions({
        nodeId,
        pipelinePath,
        flavor,
        index: index + 1,
        showAddBrick: context.showAddBrick,
      });

      const contentProps = getBrickContentProps({
        brickConfig,
        traceRecord,
      });

      const brickNodeState = getNodeState({
        active: !context.isSubPipelineHeaderActive && context.isNodeActive,
        nodeId,
        nestingLevel,
        showBiggerActions: context.showBiggerActions,
        nodeActions: context.expanded ? [] : brickNodeActions,
        isParentActive,
      });

      nodes.push({
        type: "brick",
        key: instanceId,
        ...contentProps,
        ...brickNodeState,
        onClickMoveUp,
        onClickMoveDown,
        hasSubPipelines: context.hasSubPipelines,
        collapsed: context.collapsed,
        isSubPipelineHeaderActive: context.isSubPipelineHeaderActive,
      });

      if (context.expanded) {
        const { nodes: subNodes, modComponentHasTraces: subPipelineHasTraces } =
          getSubPipelineNodes({
            index,
            brickConfig,
            pipelinePath,
            nestingLevel,
            isParentActive,
            isAncestorActive,
            traceRecord,
            latestPipelineCall,
            isSubPipelineHeaderActive: context.isSubPipelineHeaderActive,
            mapPipelineToNodes,
            getNodeState,
          });

        nodes.push(...subNodes);

        modComponentHasTraces ||= subPipelineHasTraces;

        const footerNodeState = getNodeState({
          active: !context.isSubPipelineHeaderActive && context.isNodeActive,
          nodeId: instanceId,
          nestingLevel,
          showBiggerActions: context.showBiggerActions,
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
      createNodeActions,
      getBrickContentProps,
      getBrickContext,
      getNodeMovement,
      traces,
    ],
  );
}
