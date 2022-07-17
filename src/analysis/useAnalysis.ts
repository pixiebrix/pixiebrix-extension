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

import { useDispatch, useSelector } from "react-redux";
import { UUID } from "@/core";
import { RuntimeState } from "@/pageEditor/slices/runtimeSlice";
import { useCallback } from "react";
import { AbsolutePosition, Analysis } from "@/analysis/analysisTypes";
import { TraceAnalysis } from "@/analysis/analysisVisitors";
import analysisSlice from "@/analysis/analysisSlice";

export type AnalysisCallbacks = {
  analyzeField: (
    extensionId: UUID,
    position: AbsolutePosition,
    prop: string
  ) => void;
};

/**
 * Hook for refreshing analysis results.
 */
function useAnalysis(extensionId: UUID): AnalysisCallbacks {
  const dispatch = useDispatch();
  const extensionTrace = useSelector(
    ({ runtime }: { runtime: RuntimeState }) =>
      runtime.extensionTraces[extensionId]
  );

  const analyzeField = useCallback(
    async (extensionId: UUID, position: AbsolutePosition, prop: string) => {
      // Run high-priority analyses, e.g., field syntax
      // Run low-priority analyses, e.g., trace errors, long-running checks, etc.
      const queue: Analysis[] = [new TraceAnalysis(extensionTrace)];

      for (const analysis of queue) {
        dispatch(
          analysisSlice.actions.startAnalysis({
            extensionId,
            analysisId: analysis.id,
          })
        );
        // TODO: actually run the analysis on the extension
        dispatch(
          analysisSlice.actions.finishAnalysis({
            extensionId,
            analysisId: analysis.id,
            annotations: analysis.getAnnotations(),
          })
        );
      }
    },
    [dispatch, extensionTrace]
  );

  return {
    analyzeField,
  };
}

export default useAnalysis;
