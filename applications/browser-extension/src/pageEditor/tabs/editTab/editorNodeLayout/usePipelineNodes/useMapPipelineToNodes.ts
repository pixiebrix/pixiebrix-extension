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

import { type BrickPipeline, type PipelineFlavor } from "../../../../../bricks/types";
import { PIPELINE_BRICKS_FIELD_NAME } from "../../../../consts";
import {
  type MapOutput,
  type EditorNodeProps,
} from "./types";
import { type useGetNodeState } from "./useGetNodeState";
import { useGetSubPipelineNodes } from "./useGetSubPipelineNodes";
import { useGetTraceHandling } from "./useGetTraceHandling";
import { useGetLastBrickHandling } from "./useLastBrickHandling";
import { useMapBrickToNodes } from "./useMapBrickToNodes";
import { type Branch } from "../../../../../types/runtimeTypes";
import { useCallback } from "react";

export type MapPipelineToNodesArgs = {
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
  mapPipelineToNodes: ReturnType<typeof useMapPipelineToNodes>;
  getNodeState: ReturnType<typeof useGetNodeState>;
};

export function useMapPipelineToNodes(): (
  args: MapPipelineToNodesArgs,
) => MapOutput {
  const getTraceHandling = useGetTraceHandling();
  const getLastBrickHandling = useGetLastBrickHandling();
  const mapBrickToNodes = useMapBrickToNodes();
  const getSubPipelineNodes = useGetSubPipelineNodes();

  return useCallback(
    ({
      pipeline,
      flavor,
      pipelinePath = PIPELINE_BRICKS_FIELD_NAME,
      nestingLevel = 0,
      isParentActive = false,
      isAncestorActive = false,
      latestParentCall,
      mapPipelineToNodes,
      getNodeState,
    }: MapPipelineToNodesArgs) => {
      const isRootPipeline = pipelinePath === PIPELINE_BRICKS_FIELD_NAME;
      const { lastIndex, showAppend } = getLastBrickHandling(pipeline);

      const latestPipelineCall = getTraceHandling({
        pipeline,
        latestParentCall,
      });

      const nodes: EditorNodeProps[] = [];
      let modComponentHasTraces = false;

      for (const [index, brickConfig] of pipeline.entries()) {
        const {
          nodes: brickNodes,
          modComponentHasTraces: modComponentHasTracesOut,
        }: MapOutput = mapBrickToNodes({
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
          modComponentHasTraces,
          getSubPipelineNodes,
          mapPipelineToNodes,
          getNodeState,
        });

        nodes.push(...brickNodes);
        modComponentHasTraces ||= modComponentHasTracesOut;
      }

      return {
        nodes,
        modComponentHasTraces,
      };
    },
    [
      getLastBrickHandling,
      getSubPipelineNodes,
      getTraceHandling,
      mapBrickToNodes,
    ],
  );
}
