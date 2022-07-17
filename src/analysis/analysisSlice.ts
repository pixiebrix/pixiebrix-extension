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

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Annotation } from "@/analysis/analysisTypes";
import { UUID } from "@/core";

type AnalysisState = {
  // `path -> annotation`
  extensionAnnotations: Record<UUID, Annotation[]>;
};

const initialState: AnalysisState = {
  extensionAnnotations: {},
};

const analysisSlice = createSlice({
  name: "analysis",
  initialState,
  reducers: {
    startAnalysis(
      state,
      action: PayloadAction<{ extensionId: UUID; analysisId: string }>
    ) {
      const { extensionId, analysisId } = action.payload;
      if (state.extensionAnnotations[extensionId]) {
        state.extensionAnnotations[extensionId] = state.extensionAnnotations[
          extensionId
        ].filter((x) => x.analysisId !== analysisId);
      } else {
        state.extensionAnnotations[extensionId] = [];
      }
    },
    finishAnalysis(
      state,
      action: PayloadAction<{
        extensionId: UUID;
        analysisId: string;
        annotations: Annotation[];
      }>
    ) {
      const { extensionId, analysisId, annotations } = action.payload;

      // Clear out any existing annotations for this analysis. Should have already been cleared in startAnalysis, but
      // do just in case of race condition
      if (state.extensionAnnotations[extensionId]) {
        state.extensionAnnotations[extensionId] = state.extensionAnnotations[
          extensionId
        ].filter((x) => x.analysisId !== analysisId);
      } else {
        state.extensionAnnotations[extensionId] = [];
      }

      state.extensionAnnotations[extensionId] = [
        ...state.extensionAnnotations[extensionId],
        ...annotations,
      ];
    },
  },
});

export default analysisSlice;
