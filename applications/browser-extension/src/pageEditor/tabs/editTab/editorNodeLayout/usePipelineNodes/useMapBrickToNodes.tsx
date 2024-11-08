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
import { type BrickConfig, type PipelineFlavor } from "@/bricks/types";
import {
  filterTracesByCall,
  getLatestBrickCall,
} from "@/telemetry/traceHelpers";
import { isEmpty } from "lodash";
import { type Branch } from "../../../../../types/runtimeTypes";
import { assertNotNullish } from "../../../../../utils/nullishUtils";
import { type MapOutput, type EditorNodeProps } from "./types";
import { getBuilderPreviewElementId, getSubPipelinesForBrick } from "./helpers";
import {
  selectActiveBuilderPreviewElement,
  selectActiveModComponentFormState,
  selectActiveNodeId,
  selectCollapsedNodes,
} from "../../../../store/editor/editorSelectors";
import { selectActiveModComponentTraces } from "../../../../store/runtime/runtimeSelectors";
import { useSelector } from "react-redux";
import useApiVersionAtLeast from "../../../../hooks/useApiVersionAtLeast";
import useTypedBrickMap from "@/bricks/hooks/useTypedBrickMap";
import { useCreateNodeActions } from "./useCreateNodeActions";
import { type useGetNodeState } from "./useGetNodeState";
import { type useGetSubPipelineNodes } from "./useGetSubPipelineNodes";
import { useGetBrickContentProps } from "./useGetBrickContentProps";
import { useGetNodeMovement } from "./useGetNodeMovement";
import { type useMapPipelineToNodes } from "./useMapPipelineToNodes";
import { type NodeAction } from "../../editorNodes/nodeActions/NodeActionsView";
import { type TraceRecord } from "../../../../../telemetry/trace";

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

function createBrickNode({
  brickConfig,
  context,
  getBrickContentProps,
  getNodeMovement,
  getNodeState,
  lastIndex,
  index,
  isParentActive,
  nestingLevel,
  nodeActions,
  traceRecord,
}: {
  brickConfig: BrickConfig;
  context: BrickNodeContext;
  getBrickContentProps: ReturnType<typeof useGetBrickContentProps>;
  getNodeMovement: ReturnType<typeof useGetNodeMovement>;
  getNodeState: ReturnType<typeof useGetNodeState>;
  lastIndex: number;
  index: number;
  isParentActive: boolean;
  nestingLevel: number;
  nodeActions: NodeAction[];
  traceRecord?: TraceRecord;
}): Extract<EditorNodeProps, { type: "brick" }> {
  const { instanceId } = brickConfig;
  assertNotNullish(instanceId, "instanceId is required");

  const brickNodeState = getNodeState({
    active: !context.isSubPipelineHeaderActive && context.isNodeActive,
    nodeId: instanceId,
    nestingLevel,
    showBiggerActions: context.showBiggerActions,
    nodeActions: context.expanded ? [] : nodeActions,
    isParentActive,
  });

  const contentProps = getBrickContentProps({
    brickConfig,
    traceRecord,
  });

  const movement = getNodeMovement({
    nodeId: instanceId,
    index,
    lastIndex,
  });

  return {
    type: "brick",
    key: instanceId,
    ...brickNodeState,
    ...contentProps,
    ...movement,
    hasSubPipelines: context.hasSubPipelines,
    collapsed: context.collapsed,
    isSubPipelineHeaderActive: context.isSubPipelineHeaderActive,
  };
}

function createFooterNode({
  brickConfig,
  context,
  isParentActive,
  nestingLevel,
  nodeActions,
  getNodeState,
}: {
  brickConfig: BrickConfig;
  context: BrickNodeContext;
  isParentActive: boolean;
  nestingLevel: number;
  nodeActions: NodeAction[];
  getNodeState: ReturnType<typeof useGetNodeState>;
}): Extract<EditorNodeProps, { type: "footer" }> {
  const { instanceId } = brickConfig;
  assertNotNullish(instanceId, "instanceId is required");

  const footerNodeState = getNodeState({
    active: !context.isSubPipelineHeaderActive && context.isNodeActive,
    nodeId: instanceId,
    nestingLevel,
    showBiggerActions: context.showBiggerActions,
    nodeActions,
  });

  return {
    type: "footer",
    key: `${instanceId}-footer`,
    ...footerNodeState,
    outputKey: brickConfig.outputKey,
    nestedActive: isParentActive,
  };
}

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

      const brickNodeActions = createNodeActions({
        nodeId: instanceId,
        pipelinePath,
        flavor,
        index: index + 1,
        showAddBrick: context.showAddBrick,
      });

      nodes.push(
        createBrickNode({
          brickConfig,
          context,
          getBrickContentProps,
          getNodeMovement,
          getNodeState,
          lastIndex,
          index,
          isParentActive,
          nestingLevel,
          nodeActions: brickNodeActions,
          traceRecord,
        }),
      );

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

        nodes.push(
          createFooterNode({
            brickConfig,
            context,
            isParentActive,
            nestingLevel,
            nodeActions: brickNodeActions,
            getNodeState,
          }),
        );
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
