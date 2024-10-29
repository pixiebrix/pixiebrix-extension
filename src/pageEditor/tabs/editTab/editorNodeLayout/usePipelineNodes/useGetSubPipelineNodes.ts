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

import { type EditorNodeProps } from "./types";
import { type PipelineFlavor, type BrickConfig } from "@/bricks/types";
import { joinPathParts } from "@/utils/formUtils";
import { getBuilderPreviewElementId, getSubPipelinesForBrick } from "./helpers";
import { SCROLL_TO_DOCUMENT_PREVIEW_ELEMENT_EVENT } from "@/pageEditor/documentBuilder/preview/ElementPreview";
import { type AppDispatch } from "@/extensionConsole/store";
import { useCreateNodeActions } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useCreateNodeActions";
import { type useGetNodeState } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useGetNodeState";
import { type useMapPipelineToNodes } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useMapPipelineToNodes";
import { type Branch } from "@/types/runtimeTypes";
import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { actions } from "@/pageEditor/store/editor/editorSlice";
import { assertNotNullish } from "@/utils/nullishUtils";
import useTypedBrickMap from "@/bricks/hooks/useTypedBrickMap";
import {
  selectActiveBuilderPreviewElement,
  selectActiveNodeId,
} from "@/pageEditor/store/editor/editorSelectors";
import { type TraceRecord } from "@/telemetry/trace";

type GetSubPipelineNodesProps = {
  index: number;
  brickConfig: BrickConfig;
  pipelinePath: string;
  nestingLevel: number;
  isParentActive: boolean;
  isAncestorActive: boolean;
  isSubPipelineHeaderActive: boolean;
  traceRecord?: TraceRecord;
  latestPipelineCall?: Branch[];
  mapPipelineToNodes: ReturnType<typeof useMapPipelineToNodes>;
  getNodeState: ReturnType<typeof useGetNodeState>;
};

function createHeaderNode({
  activeBuilderPreviewElementId,
  brickConfig,
  createNodeActions,
  flavor,
  fullSubPath,
  getNodeState,
  headerLabel,
  inputKey,
  isHeaderNodeActive,
  isLoadingBricks,
  isParentActive,
  isSiblingHeaderActive,
  nestingLevel,
  path,
}: {
  activeBuilderPreviewElementId: string | null;
  brickConfig: BrickConfig;
  createNodeActions: ReturnType<typeof useCreateNodeActions>;
  flavor: PipelineFlavor;
  fullSubPath: string;
  getNodeState: ReturnType<typeof useGetNodeState>;
  headerLabel: string;
  inputKey?: string;
  isHeaderNodeActive: boolean;
  isLoadingBricks: boolean;
  isParentActive: boolean;
  isSiblingHeaderActive: boolean;
  nestingLevel: number;
  path: string;
}) {
  return (
    dispatch: AppDispatch,
  ): Extract<EditorNodeProps, { type: "header" }> => {
    const { instanceId } = brickConfig;
    assertNotNullish(instanceId, "instanceId is required");

    const builderPreviewElementId = getBuilderPreviewElementId(
      brickConfig,
      path,
    );

    const headerName = `${instanceId}-header`;

    const headerActions = createNodeActions({
      nodeId: headerName,
      pipelinePath: fullSubPath,
      flavor,
      index: 0,
      showAddBrick: true,
    });

    const headerNodeState = getNodeState({
      active: isHeaderNodeActive || false,
      nodeId: instanceId,
      nestingLevel,
      nodeActions: headerActions,
      isParentActive: !isSiblingHeaderActive && isParentActive,
    });

    return {
      type: "header",
      key: fullSubPath,
      ...headerNodeState,
      headerLabel,
      nestingLevel,
      pipelineInputKey: inputKey,
      isAncestorActive: !isSiblingHeaderActive && isParentActive,
      builderPreviewElement: builderPreviewElementId
        ? {
            name: builderPreviewElementId,
            focus() {
              dispatch(actions.setActiveNodeId(instanceId));
              dispatch(
                actions.setActiveBuilderPreviewElement(builderPreviewElementId),
              );
              window.dispatchEvent(
                new Event(
                  `${SCROLL_TO_DOCUMENT_PREVIEW_ELEMENT_EVENT}-${builderPreviewElementId}`,
                ),
              );
            },
            active: builderPreviewElementId === activeBuilderPreviewElementId,
          }
        : null,
      isPipelineLoading: isLoadingBricks,
    };
  };
}

export function useGetSubPipelineNodes() {
  const dispatch = useDispatch<AppDispatch>();
  const activeNodeId = useSelector(selectActiveNodeId);
  const activeBuilderPreviewElementId = useSelector(
    selectActiveBuilderPreviewElement,
  );

  const createNodeActions = useCreateNodeActions();

  const { data: allBricks, isLoading: isLoadingBricks } = useTypedBrickMap();

  return useCallback(
    ({
      index,
      brickConfig,
      latestPipelineCall,
      pipelinePath,
      nestingLevel,
      isParentActive,
      isAncestorActive,
      traceRecord,
      isSubPipelineHeaderActive,
      mapPipelineToNodes,
      getNodeState,
    }: GetSubPipelineNodesProps) => {
      const nodeId = brickConfig.instanceId;
      assertNotNullish(nodeId, "instanceId is required");

      const isNodeActive = nodeId === activeNodeId;

      const brick = allBricks?.get(brickConfig.id)?.block;
      const subPipelines = getSubPipelinesForBrick(brick, brickConfig);

      const nodes: EditorNodeProps[] = [];
      let modComponentHasTraces = false;

      for (const {
        headerLabel,
        pipeline,
        path,
        flavor,
        inputKey,
      } of subPipelines) {
        const fullSubPath = joinPathParts(pipelinePath, index, path);
        const builderPreviewElementId = getBuilderPreviewElementId(
          brickConfig,
          path,
        );
        const isHeaderNodeActive = Boolean(
          activeBuilderPreviewElementId &&
            builderPreviewElementId === activeBuilderPreviewElementId,
        );
        const isSiblingHeaderActive = isSubPipelineHeaderActive;

        // Add header node
        nodes.push(
          dispatch(
            createHeaderNode({
              activeBuilderPreviewElementId,
              brickConfig,
              createNodeActions,
              flavor,
              fullSubPath,
              getNodeState,
              headerLabel,
              inputKey,
              isHeaderNodeActive,
              isLoadingBricks,
              isParentActive,
              isSiblingHeaderActive,
              nestingLevel,
              path,
            }),
          ),
        );

        // Map sub-pipeline nodes
        const {
          nodes: subPipelineNodes,
          modComponentHasTraces: subPipelineHasTraces,
        } = mapPipelineToNodes({
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
          latestParentCall: traceRecord?.branches ?? latestPipelineCall,
          mapPipelineToNodes,
          getNodeState,
        });

        nodes.push(...subPipelineNodes);
        modComponentHasTraces ||= subPipelineHasTraces;
      }

      return { nodes, modComponentHasTraces };
    },
    [
      activeBuilderPreviewElementId,
      activeNodeId,
      allBricks,
      createNodeActions,
      dispatch,
      isLoadingBricks,
    ],
  );
}
