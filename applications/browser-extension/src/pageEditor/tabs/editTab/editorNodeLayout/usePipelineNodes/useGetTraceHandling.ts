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

import { selectActiveModComponentTraces } from "@/pageEditor/store/runtime/runtimeSelectors";
import { type MapPipelineToNodesArgs } from "@/pageEditor/tabs/editTab/editorNodeLayout/usePipelineNodes/useMapPipelineToNodes";
import {
  filterTracesByCall,
  getLatestBrickCall,
} from "@/telemetry/traceHelpers";
import { useCallback } from "react";
import { useSelector } from "react-redux";

export function useGetTraceHandling() {
  const traces = useSelector(selectActiveModComponentTraces);

  return useCallback(
    ({
      pipeline,
      latestParentCall,
    }: Pick<MapPipelineToNodesArgs, "pipeline" | "latestParentCall">) => {
      // Default to no traces
      if (pipeline.length === 0) {
        return;
      }

      // Pass [] as default to include all traces
      const latestTraces = filterTracesByCall(traces, latestParentCall ?? []);

      // Use first brick in pipeline to determine the latest run
      return getLatestBrickCall(latestTraces, pipeline[0]?.instanceId)
        ?.branches;
    },
    [traces],
  );
}
