/* eslint-disable security/detect-object-injection -- working with records a lot */
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

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import {
  type AnalysisState,
  type AnalysisAnnotation,
} from "@/analysis/analysisTypes";
import type VarMap from "./analysisVisitors/varAnalysis/varMap";
import { type ErrorObject } from "serialize-error";
import { type UUID } from "@/types/stringTypes";

const initialState: AnalysisState = {
  extensionAnnotations: {},
  knownVars: {},
  knownEventNames: {},
};

const analysisSlice = createSlice({
  name: "analysis",
  initialState,
  reducers: {
    // `startAnalysis` action is to help with debugging via redux-logger
    startAnalysis(
      state,
      action: PayloadAction<{ modComponentId: UUID; analysisId: string }>,
    ) {
      // NOP
    },
    // `failAnalysis` action is to help with debugging via redux-logger
    failAnalysis(
      state,
      action: PayloadAction<{
        modComponentId: UUID;
        analysisId: string;
        error: ErrorObject;
      }>,
    ) {
      // NOP
    },
    finishAnalysis(
      state,
      action: PayloadAction<{
        modComponentId: UUID;
        analysisId: string;
        annotations: AnalysisAnnotation[];
      }>,
    ) {
      const { modComponentId, analysisId, annotations } = action.payload;

      // Clear out any existing annotations for this analysis.
      if (state.extensionAnnotations[modComponentId]) {
        state.extensionAnnotations[modComponentId] = state.extensionAnnotations[
          modComponentId
        ].filter((x) => x.analysisId !== analysisId);
      } else {
        state.extensionAnnotations[modComponentId] = [];
      }

      state.extensionAnnotations[modComponentId] = [
        ...state.extensionAnnotations[modComponentId],
        ...annotations,
      ];
    },
    setKnownVars(
      state,
      action: PayloadAction<{
        modComponentId: UUID;
        vars: Map<string, VarMap>;
      }>,
    ) {
      const { modComponentId, vars } = action.payload;
      state.knownVars[modComponentId] = vars;
    },
    setKnownEventNames(
      state,
      action: PayloadAction<{
        modComponentId: UUID;
        eventNames: string[];
      }>,
    ) {
      const { modComponentId, eventNames } = action.payload;
      state.knownEventNames[modComponentId] = eventNames;
    },
  },
});

export default analysisSlice;
