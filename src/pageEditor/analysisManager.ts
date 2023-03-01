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

import BlockTypeAnalysis from "@/analysis/analysisVisitors/blockTypeAnalysis";
import ExtensionUrlPatternAnalysis from "@/analysis/analysisVisitors/extensionUrlPatternAnalysis";
import OutputKeyAnalysis from "@/analysis/analysisVisitors/outputKeyAnalysis";
import RenderersAnalysis from "@/analysis/analysisVisitors/renderersAnalysis";
import TemplateAnalysis from "@/analysis/analysisVisitors/templateAnalysis";
import TraceAnalysis from "@/analysis/analysisVisitors/traceAnalysis";
import ReduxAnalysisManager from "@/analysis/ReduxAnalysisManager";
import { type UUID } from "@/core";
import { type TraceRecord } from "@/telemetry/trace";
import { isAnyOf, type PayloadAction } from "@reduxjs/toolkit";
import { type RootState } from "./pageEditorTypes";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import runtimeSlice from "./slices/runtimeSlice";
import RequestPermissionAnalysis from "@/analysis/analysisVisitors/requestPermissionAnalysis";
import FormBrickAnalysis from "@/analysis/analysisVisitors/formBrickAnalysis";
import { selectActiveElementTraces } from "./slices/runtimeSelectors";
import VarAnalysis from "@/analysis/analysisVisitors/varAnalysis/varAnalysis";
import analysisSlice from "@/analysis/analysisSlice";
import RegexAnalysis from "@/analysis/analysisVisitors/regexAnalysis";

const runtimeActions = runtimeSlice.actions;

const pageEditorAnalysisManager = new ReduxAnalysisManager();

// These actions will be used with every analysis so the annotation path is up-to-date
// with the node position in the pipeline
const nodeListMutationActions = [
  editorActions.addNode,
  editorActions.moveNode,
  editorActions.removeNode,
] as const;

// The order in which the analysis are registered is important.
// The first analysis registered will be the first to run.
// When multiple actions (e.g. typing) trigger analysis, the later analysis have more chances to get aborted.
// Try to put the faster analysis first, and the slower ones at the end.

pageEditorAnalysisManager.registerAnalysisEffect(
  (
    action: PayloadAction<{ extensionId: UUID; records: TraceRecord[] }>,
    state: RootState
  ) => {
    // TraceAnalysis filter the trace errors, thus
    // selecting all records here to avoid double filtering
    const records = selectActiveElementTraces(state);

    return new TraceAnalysis(records);
  },
  {
    matcher: isAnyOf(
      runtimeActions.setExtensionTrace,
      ...nodeListMutationActions
    ),
  }
);

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new BlockTypeAnalysis(),
  {
    matcher: isAnyOf(...nodeListMutationActions),
  }
);

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new FormBrickAnalysis(),
  {
    matcher: isAnyOf(...nodeListMutationActions),
  }
);

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new RenderersAnalysis(),
  {
    matcher: isAnyOf(...nodeListMutationActions),
  }
);

pageEditorAnalysisManager.registerAnalysisEffect(() => new TemplateAnalysis(), {
  matcher: isAnyOf(editorActions.editElement, ...nodeListMutationActions),
});

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new ExtensionUrlPatternAnalysis(),
  {
    matcher: isAnyOf(editorActions.editElement, ...nodeListMutationActions),
  }
);

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new RequestPermissionAnalysis(),
  {
    matcher: isAnyOf(editorActions.editElement, ...nodeListMutationActions),
  }
);

pageEditorAnalysisManager.registerAnalysisEffect(() => new RegexAnalysis(), {
  matcher: isAnyOf(editorActions.editElement, ...nodeListMutationActions),
});

const varAnalysisFactory = (
  action: PayloadAction<{ extensionId: UUID; records: TraceRecord[] }>,
  state: RootState
) => {
  const records = selectActiveElementTraces(state);
  return new VarAnalysis(records);
};

// OutputKeyAnalysis seems to be the slowest one, so we register it in the end
pageEditorAnalysisManager.registerAnalysisEffect(
  () => new OutputKeyAnalysis(),
  {
    matcher: isAnyOf(editorActions.editElement, ...nodeListMutationActions),
  }
);

// VarAnalysis is not the slowest itself, but it triggers a post-analysis action,
// so it is the last one
pageEditorAnalysisManager.registerAnalysisEffect(
  varAnalysisFactory,
  {
    matcher: isAnyOf(
      editorActions.editElement,
      runtimeActions.setExtensionTrace,
      ...nodeListMutationActions
    ),
  },
  {
    postAnalysisAction(analysis, extensionId, listenerApi) {
      listenerApi.dispatch(
        analysisSlice.actions.setKnownVars({
          extensionId,
          vars: analysis.getKnownVars(),
        })
      );
    },
  }
);

export default pageEditorAnalysisManager;
