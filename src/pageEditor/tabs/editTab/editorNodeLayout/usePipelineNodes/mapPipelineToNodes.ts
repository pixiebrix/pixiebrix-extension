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

import { type TypedBrickMap } from "@/bricks/registry";
import { type BrickPipeline, type PipelineFlavor } from "@/bricks/types";
import { PIPELINE_BRICKS_FIELD_NAME } from "@/pageEditor/consts";
import { type AppDispatch } from "@/pageEditor/store/store";
import { mapBrickToNodes } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/mapBrickToNodes";
import {
  type MapOutput,
  type EditorNodeProps,
} from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/types";
import { BrickTypes } from "@/runtime/runtimeTypes";
import { type TraceRecord } from "@/telemetry/trace";
import {
  filterTracesByCall,
  getLatestBrickCall,
} from "@/telemetry/traceHelpers";
import { type Branch } from "@/types/runtimeTypes";
import { type UUID } from "@/types/stringTypes";
import { type Dispatch, type SetStateAction } from "react";

export function mapPipelineToNodes({
  pipeline,
  flavor,
  pipelinePath = PIPELINE_BRICKS_FIELD_NAME,
  nestingLevel = 0,
  isParentActive = false,
  isAncestorActive = false,
  latestParentCall,
  traces,
  allBricks,
  isLoadingBricks,
  hoveredState,
  setHoveredState,
  isApiAtLeastV2,
  pasteBrick,
}: {
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
  allBricks?: TypedBrickMap;
  isLoadingBricks: boolean;
  hoveredState: Record<UUID, boolean>;
  setHoveredState: Dispatch<SetStateAction<Record<UUID, boolean>>>;
  isApiAtLeastV2: boolean;
  pasteBrick:
    | ((pipelinePath: string, pipelineIndex: number) => Promise<void>)
    | null;
}) {
  return (dispatch: AppDispatch) => {
    const isRootPipeline = pipelinePath === PIPELINE_BRICKS_FIELD_NAME;
    const lastIndex = pipeline.length - 1;
    const lastBlockId = pipeline.at(lastIndex)?.id;
    const lastBlock = lastBlockId ? allBricks?.get(lastBlockId) : undefined;
    const showAppend =
      !lastBlock?.block || lastBlock.type !== BrickTypes.RENDERER;
    const nodes: EditorNodeProps[] = [];

    // Determine which execution of the pipeline to show. Currently, getting the latest execution
    let latestPipelineCall: Branch[] | undefined;
    if (pipeline.length > 0) {
      // Pass [] as default to include all traces
      const latestTraces = filterTracesByCall(traces, latestParentCall ?? []);
      // Use first block in pipeline to determine the latest run
      latestPipelineCall = getLatestBrickCall(
        latestTraces,
        pipeline[0]?.instanceId,
      )?.branches;
    }

    let modComponentHasTraces = false;

    for (const [index, blockConfig] of pipeline.entries()) {
      const {
        nodes: blockNodes,
        modComponentHasTraces: modComponentHasTracesOut,
      }: MapOutput = dispatch(
        mapBrickToNodes({
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
          modComponentHasTraces,
          allBricks,
          isLoadingBricks,
          hoveredState,
          setHoveredState,
          isApiAtLeastV2,
          pasteBrick,
        }),
      );
      nodes.push(...blockNodes);
      modComponentHasTraces ||= modComponentHasTracesOut;
    }

    return {
      nodes,
      modComponentHasTraces,
    };
  };
}
