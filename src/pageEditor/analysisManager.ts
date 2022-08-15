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

import BlockTypeAnalysis from "@/analysis/analysisVisitors/blockTypeAnalysis";
import ExtensionUrlPatternAnalysis from "@/analysis/analysisVisitors/extensionUrlPatternAnalysis";
import OutputKeyAnalysis from "@/analysis/analysisVisitors/outputKeyAnalysis";
import RenderersAnalysis from "@/analysis/analysisVisitors/renderersAnalysis";
import TemplateAnalysis from "@/analysis/analysisVisitors/templateAnalysis";
import TraceAnalysis from "@/analysis/analysisVisitors/traceAnalysis";
import ReduxAnalysisManager from "@/analysis/ReduxAnalysisManager";
import { UUID } from "@/core";
import { TraceRecord } from "@/telemetry/trace";
import { PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "./pageEditorTypes";
import { selectActiveElement } from "./slices/editorSelectors";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import runtimeSlice from "./slices/runtimeSlice";
import { isAnyOf } from "@reduxjs/toolkit";
import RequestPermissionAnalysis from "@/analysis/analysisVisitors/requestPermissionAnalysis";

const runtimeActions = runtimeSlice.actions;

const pageEditorAnalysisManager = new ReduxAnalysisManager();

// These actions will be used with every analysis so the annotation path is up to date
// with the node position in the pipeline
const nodeListMutationActions = [
  editorActions.addNode,
  editorActions.moveNode,
  editorActions.removeNode,
];

pageEditorAnalysisManager.registerAnalysisEffect(
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
  {
    // Only needed on runtimeActions.setExtensionTrace,
    // but the block path can change when node tree is mutated
    matcher: isAnyOf(
      runtimeActions.setExtensionTrace,
      ...nodeListMutationActions
    ),
  }
);

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new BlockTypeAnalysis(),
  {
    // Only needed on editorActions.addNode,
    // but the block path can change on move or remove
    // @ts-expect-error: spreading the array as args
    matcher: isAnyOf(...nodeListMutationActions),
  }
);

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new RenderersAnalysis(),
  {
    // @ts-expect-error: spreading the array as args
    matcher: isAnyOf(...nodeListMutationActions),
  }
);

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new OutputKeyAnalysis(),
  {
    // Only needed on editorActions.editElement,
    // but the block path can change when node tree is mutated
    matcher: isAnyOf(editorActions.editElement, ...nodeListMutationActions),
  }
);

pageEditorAnalysisManager.registerAnalysisEffect(() => new TemplateAnalysis(), {
  // Only needed on editorActions.editElement,
  // but the block path can change when node tree is mutated
  matcher: isAnyOf(editorActions.editElement, ...nodeListMutationActions),
});

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new ExtensionUrlPatternAnalysis(),
  {
    // Only needed on editorActions.editElement,
    // but the block path can change when node tree is mutated
    matcher: isAnyOf(editorActions.editElement, ...nodeListMutationActions),
  }
);

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new RequestPermissionAnalysis(),
  {
    // Only needed on editorActions.editElement,
    // but the block path can change when node tree is mutated
    matcher: isAnyOf(editorActions.editElement, ...nodeListMutationActions),
  }
);

export default pageEditorAnalysisManager;
