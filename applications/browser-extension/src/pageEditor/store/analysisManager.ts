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

import BrickTypeAnalysis from "../../analysis/analysisVisitors/brickTypeAnalysis";
import ModComponentUrlPatternAnalysis from "../../analysis/analysisVisitors/modComponentUrlPatternAnalysis";
import OutputKeyAnalysis from "../../analysis/analysisVisitors/outputKeyAnalysis";
import RenderersAnalysis from "../../analysis/analysisVisitors/renderersAnalysis";
import TemplateAnalysis from "../../analysis/analysisVisitors/templateAnalysis";
import TraceAnalysis from "../../analysis/analysisVisitors/traceAnalysis";
import ReduxAnalysisManager from "../../analysis/ReduxAnalysisManager";
import { type UUID } from "../../types/stringTypes";
import { type TraceRecord } from "../../telemetry/trace";
import { isAnyOf, type PayloadAction } from "@reduxjs/toolkit";
import { type RootState } from "./editor/pageEditorTypes";
import { actions as editorActions } from "./editor/editorSlice";
import runtimeSlice from "./runtime/runtimeSlice";
import RequestPermissionAnalysis from "../../analysis/analysisVisitors/requestPermissionAnalysis";
import FormBrickAnalysis from "../../analysis/analysisVisitors/formBrickAnalysis";
import { selectActiveModComponentTraces } from "./runtime/runtimeSelectors";
import VarAnalysis from "../../analysis/analysisVisitors/varAnalysis/varAnalysis";
import analysisSlice from "../../analysis/analysisSlice";
import RegexAnalysis from "../../analysis/analysisVisitors/regexAnalysis";
import PageStateAnalysis from "../../analysis/analysisVisitors/pageStateAnalysis/pageStateAnalysis";
import CheckEventNamesAnalysis from "../../analysis/analysisVisitors/eventNameAnalysis/checkEventNamesAnalysis";
import {
  selectActiveModComponentFormState,
  selectActiveModComponentRef,
} from "./editor/editorSelectors";
import { type ModComponentFormState } from "../starterBricks/formStateTypes";
import { selectGetDraftFormStatesPromiseForModId } from "../starterBricks/adapter";
import { getPageState } from "../../contentScript/messenger/api";
import HttpRequestAnalysis from "../../analysis/analysisVisitors/httpRequestAnalysis";
import ModVariableNames from "../../analysis/analysisVisitors/pageStateAnalysis/modVariableSchemasVisitor";
import { inspectedTab } from "../context/connection";
import SelectorAnalysis from "../../analysis/analysisVisitors/selectorAnalysis";
import ConditionAnalysis from "../../analysis/analysisVisitors/conditionAnalysis";
import { StateNamespaces } from "../../platform/state/stateTypes";
import { assertNotNullish } from "../../utils/nullishUtils";

const runtimeActions = runtimeSlice.actions;

const pageEditorAnalysisManager = new ReduxAnalysisManager();

/**
 * Returns mod component form states for the active mod. Includes both clean and dirty mod component form states.
 * @param state the Page Editor Redux State
 */
async function selectActiveModFormStates(
  state: RootState,
): Promise<ModComponentFormState[]> {
  const activeModComponentFormState = selectActiveModComponentFormState(state);

  if (activeModComponentFormState) {
    return selectGetDraftFormStatesPromiseForModId(state)(
      activeModComponentFormState.modMetadata.id,
    );
  }

  return [];
}

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
    action: PayloadAction<{ modComponentId: UUID; records: TraceRecord[] }>,
    state: RootState,
  ) => {
    // TraceAnalysis filter the trace errors, thus
    // selecting all records here to avoid double filtering
    const records = selectActiveModComponentTraces(state);

    return new TraceAnalysis(records);
  },
  {
    matcher: isAnyOf(
      runtimeActions.setModComponentTrace,
      ...nodeListMutationActions,
    ),
  },
);

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new BrickTypeAnalysis(),
  {
    matcher: isAnyOf(...nodeListMutationActions),
  },
);

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new FormBrickAnalysis(),
  {
    matcher: isAnyOf(...nodeListMutationActions),
  },
);

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new RenderersAnalysis(),
  {
    matcher: isAnyOf(...nodeListMutationActions),
  },
);

pageEditorAnalysisManager.registerAnalysisEffect(() => new SelectorAnalysis(), {
  // Slow Selector Analysis currently checks the starter brick definition
  matcher: isAnyOf(editorActions.setModComponentFormState),
});

pageEditorAnalysisManager.registerAnalysisEffect(() => new TemplateAnalysis(), {
  matcher: isAnyOf(
    editorActions.setModComponentFormState,
    ...nodeListMutationActions,
  ),
});

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new PageStateAnalysis(),
  {
    matcher: isAnyOf(
      editorActions.setModComponentFormState,
      ...nodeListMutationActions,
    ),
  },
);

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new ModComponentUrlPatternAnalysis(),
  {
    matcher: isAnyOf(
      editorActions.setModComponentFormState,
      ...nodeListMutationActions,
    ),
  },
);

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new RequestPermissionAnalysis(),
  {
    matcher: isAnyOf(
      editorActions.setModComponentFormState,
      ...nodeListMutationActions,
    ),
  },
);

pageEditorAnalysisManager.registerAnalysisEffect(() => new RegexAnalysis(), {
  matcher: isAnyOf(
    editorActions.setModComponentFormState,
    ...nodeListMutationActions,
  ),
});

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new HttpRequestAnalysis(),
  {
    matcher: isAnyOf(
      editorActions.setModComponentFormState,
      ...nodeListMutationActions,
    ),
  },
);

async function varAnalysisFactory(
  _action: PayloadAction<{ modComponentId: UUID; records: TraceRecord[] }>,
  state: RootState,
) {
  const trace = selectActiveModComponentTraces(state);
  const modComponentRef = selectActiveModComponentRef(state);

  assertNotNullish(
    modComponentRef,
    "varAnalysisFactory can only be used in an active mod component context",
  );

  // The potential mod known mod variables
  const formStates = await selectActiveModFormStates(state);
  const variables = await ModVariableNames.collectSchemas(formStates);

  // The actual mod variables
  const modState = await getPageState(inspectedTab, {
    namespace: StateNamespaces.MOD,
    modComponentRef,
  });

  return new VarAnalysis({
    trace,
    modState,
    modVariables: variables.knownProperties,
  });
}

pageEditorAnalysisManager.registerAnalysisEffect(
  () => new ConditionAnalysis(),
  {
    matcher: isAnyOf(
      editorActions.setModComponentFormState,
      ...nodeListMutationActions,
    ),
  },
);

// OutputKeyAnalysis seems to be the slowest one, so we register it in the end
pageEditorAnalysisManager.registerAnalysisEffect(
  () => new OutputKeyAnalysis(),
  {
    matcher: isAnyOf(
      editorActions.setModComponentFormState,
      ...nodeListMutationActions,
    ),
  },
);

// CheckEventNamesAnalysis is not the slowest, but it triggers a post-analysis action, so put toward the end
pageEditorAnalysisManager.registerAnalysisEffect(
  async (action, state: RootState) => {
    const formStates = await selectActiveModFormStates(state);
    return new CheckEventNamesAnalysis(formStates);
  },
  {
    matcher: isAnyOf(
      // Must run whenever the active mod component changes in order to see changes from other mod components.
      editorActions.setActiveModComponentId,
      editorActions.setModComponentFormState,
      ...nodeListMutationActions,
    ),
  },
  {
    postAnalysisAction(analysis, modComponentId, listenerApi) {
      listenerApi.dispatch(
        analysisSlice.actions.setKnownEventNames({
          modComponentId,
          eventNames: analysis.knownEventNames,
        }),
      );
    },
  },
);

// VarAnalysis is not the slowest, but it triggers a post-analysis action, so put toward the end
pageEditorAnalysisManager.registerAnalysisEffect(
  varAnalysisFactory,
  {
    matcher: isAnyOf(
      editorActions.showVariablePopover,
      // Include setActiveModComponentId so that variable analysis is ready when user first types
      editorActions.setActiveModComponentId,
      editorActions.setModComponentFormState,
      runtimeActions.setModComponentTrace,
      ...nodeListMutationActions,
    ),
  },
  {
    postAnalysisAction(analysis, modComponentId, listenerApi) {
      listenerApi.dispatch(
        analysisSlice.actions.setKnownVars({
          modComponentId,
          vars: analysis.getKnownVars(),
        }),
      );
    },
  },
);

export default pageEditorAnalysisManager;
