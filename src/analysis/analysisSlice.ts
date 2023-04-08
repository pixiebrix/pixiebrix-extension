/* eslint-disable security/detect-object-injection -- working with records a lot */
/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  type AnalysisState,
  type AnalysisAnnotation,
} from "@/analysis/analysisTypes";
import type VarMap from "./analysisVisitors/varAnalysis/varMap";
import { type ErrorObject } from "serialize-error";
import { UUID } from "@/types/stringTypes";

const initialState: AnalysisState = {
  extensionAnnotations: {},
  knownVars: {},
};

const analysisSlice = createSlice({
  name: "analysis",
  initialState,
  reducers: {
    // `startAnalysis` action is to help with debugging via redux-logger
    startAnalysis(
      state,
      action: PayloadAction<{ extensionId: UUID; analysisId: string }>
    ) {
      // NOP
    },
    // `failAnalysis` action is to help with debugging via redux-logger
    failAnalysis(
      state,
      action: PayloadAction<{
        extensionId: UUID;
        analysisId: string;
        error: ErrorObject;
      }>
    ) {
      // NOP
    },
    finishAnalysis(
      state,
      action: PayloadAction<{
        extensionId: UUID;
        analysisId: string;
        annotations: AnalysisAnnotation[];
      }>
    ) {
      const { extensionId, analysisId, annotations } = action.payload;

      // Clear out any existing annotations for this analysis.
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
    setKnownVars(
      state,
      action: PayloadAction<{
        extensionId: UUID;
        vars: Map<string, VarMap>;
      }>
    ) {
      const { extensionId, vars } = action.payload;
      state.knownVars[extensionId] = vars;
    },
  },
});

export default analysisSlice;
