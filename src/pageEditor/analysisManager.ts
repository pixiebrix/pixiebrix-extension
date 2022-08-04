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

import ExtensionUrlPatternAnalysis from "@/analysis/analysisVisitors/extensionUrlPatternAnalysis";
import OutputKeyAnalysis from "@/analysis/analysisVisitors/outputKeyAnalysis";
import TemplateAnalysis from "@/analysis/analysisVisitors/templateAnalysis";
import TraceAnalysis from "@/analysis/analysisVisitors/traceAnalysis";
import EditorManager from "@/analysis/editorManager";
import { UUID } from "@/core";
import { TraceRecord } from "@/telemetry/trace";
import { PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./pageEditorTypes";
import { selectActiveElement } from "./slices/editorSelectors";
import { editorSlice } from "./slices/editorSlice";
import runtimeSlice from "./slices/runtimeSlice";

const analysisManager = new EditorManager();

analysisManager.registerAnalysisEffect(
  (
    action: PayloadAction<{ extensionId: UUID; records: TraceRecord[] }>,
    state: RootState
  ) => {
    const { extensionId, records } = action.payload;
    const activeElement = selectActiveElement(state);
    const activeElementId = activeElement.uuid;
    if (activeElementId === extensionId) {
      return new TraceAnalysis(records);
    }

    return null;
  },
  { actionCreator: runtimeSlice.actions.setExtensionTrace }
);

analysisManager.registerAnalysisEffect(() => new OutputKeyAnalysis(), {
  actionCreator: editorSlice.actions.editElement,
});

analysisManager.registerAnalysisEffect(() => new TemplateAnalysis(), {
  actionCreator: editorSlice.actions.editElement,
});

analysisManager.registerAnalysisEffect(
  () => new ExtensionUrlPatternAnalysis(),
  {
    actionCreator: editorSlice.actions.editElement,
  }
);

export default analysisManager;
