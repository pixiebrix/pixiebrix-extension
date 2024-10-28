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

import useTypedBrickMap from "@/bricks/hooks/useTypedBrickMap";
import { type BrickPipeline, type PipelineFlavor } from "@/bricks/types";
import { PIPELINE_BRICKS_FIELD_NAME } from "@/pageEditor/consts";
import {
  type MapOutput,
  type EditorNodeProps,
} from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/types";
import { type MapBrickToNodesArgs } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useMapBrickToNodes";
import { BrickTypes } from "@/runtime/runtimeTypes";
import { type TraceRecord } from "@/telemetry/trace";
import {
  filterTracesByCall,
  getLatestBrickCall,
} from "@/telemetry/traceHelpers";
import { type Branch } from "@/types/runtimeTypes";
import { useCallback } from "react";

type MapPipelineToNodesArgs = {
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
  traces: TraceRecord[];
};

export function useMapPipelineToNodes(
  mapBrickToNodes: (args: MapBrickToNodesArgs) => MapOutput,
): (args: MapPipelineToNodesArgs) => MapOutput {
  const { data: allBricks } = useTypedBrickMap();

  return useCallback(
    ({
      pipeline,
      flavor,
      pipelinePath = PIPELINE_BRICKS_FIELD_NAME,
      nestingLevel = 0,
      isParentActive = false,
      isAncestorActive = false,
      latestParentCall,
      traces,
    }: MapPipelineToNodesArgs) => {
      const isRootPipeline = pipelinePath === PIPELINE_BRICKS_FIELD_NAME;
      const lastIndex = pipeline.length - 1;
      const lastBrickId = pipeline.at(lastIndex)?.id;
      const lastBrick = lastBrickId ? allBricks?.get(lastBrickId) : undefined;
      const showAppend =
        !lastBrick?.block || lastBrick.type !== BrickTypes.RENDERER;
      const nodes: EditorNodeProps[] = [];

      // Determine which execution of the pipeline to show. Currently, getting the latest execution
      let latestPipelineCall: Branch[] | undefined;
      if (pipeline.length > 0) {
        // Pass [] as default to include all traces
        const latestTraces = filterTracesByCall(traces, latestParentCall ?? []);
        // Use first brick in pipeline to determine the latest run
        latestPipelineCall = getLatestBrickCall(
          latestTraces,
          pipeline[0]?.instanceId,
        )?.branches;
      }

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
        });

        nodes.push(...brickNodes);
        modComponentHasTraces ||= modComponentHasTracesOut;
      }

      return {
        nodes,
        modComponentHasTraces,
      };
    },
    [allBricks, mapBrickToNodes],
  );
}
