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

import { selectActiveElement } from "@/pageEditor/slices/editorSelectors";
import { AnyAction, createListenerMiddleware } from "@reduxjs/toolkit";
import { ValidatorEffect } from "@/pageEditor/validation/validationTypes";
import analysisSlice from "./analysisSlice";
import { editorSlice } from "@/pageEditor/slices/editorSlice";
import { FormState } from "@/pageEditor/pageEditorTypes";
import OutputKeyAnalysis from "./analysisVisitors/outputKeyAnalisys";
import {
  MatchFunction,
  TypedActionCreator,
} from "@reduxjs/toolkit/dist/listenerMiddleware/types";
import AnalysisVisitor from "./AnalysisVisitor";

type AnalysisEffectConfig = {
  actionCreator?: TypedActionCreator<any>;
  matcher?: MatchFunction<AnyAction>;
};

type AnalysisFactory<TAction = AnyAction, TState = unknown> = (
  action: TAction,
  state: TState
) => AnalysisVisitor | null;

class EditorManager {
  private readonly listenerMiddleware = createListenerMiddleware();
  public get middleware() {
    return this.listenerMiddleware.middleware;
  }

  constructor() {
    this.registerOutputKeyAnalysis();
  }

  public registerAnalysisEffect(
    analysisFactory: AnalysisFactory,
    config: AnalysisEffectConfig
  ) {
    const effect: ValidatorEffect = async (action, listenerApi) => {
      const state = listenerApi.getState();
      const analysis = analysisFactory(action, state);
      if (!analysis) {
        return;
      }

      const activeElement = selectActiveElement(state);
      const activeElementId = activeElement.uuid;

      listenerApi.dispatch(
        analysisSlice.actions.startAnalysis({
          extensionId: activeElementId,
          analysisId: analysis.id,
        })
      );

      await analysis.visitRootPipeline(activeElement.extension.blockPipeline, {
        extensionType: activeElement.type,
      });

      listenerApi.dispatch(
        analysisSlice.actions.finishAnalysis({
          extensionId: activeElementId,
          analysisId: analysis.id,
          annotations: analysis.getAnnotations(),
        })
      );
    };

    this.listenerMiddleware.startListening({
      ...config,
      effect,
    });
  }

  private registerOutputKeyAnalysis() {
    const effect: ValidatorEffect = async (action, listenerApi) => {
      const element: FormState = action.payload;

      const outputKeyAnalysis = new OutputKeyAnalysis();

      listenerApi.dispatch(
        analysisSlice.actions.startAnalysis({
          extensionId: element.uuid,
          analysisId: outputKeyAnalysis.id,
        })
      );

      await outputKeyAnalysis.visitRootPipeline(
        element.extension.blockPipeline,
        {
          extensionType: element.type,
        }
      );

      listenerApi.dispatch(
        analysisSlice.actions.finishAnalysis({
          extensionId: element.uuid,
          analysisId: outputKeyAnalysis.id,
          annotations: outputKeyAnalysis.getAnnotations(),
        })
      );
    };

    this.listenerMiddleware.startListening({
      actionCreator: editorSlice.actions.editElement,
      effect,
    });
  }
}

export default EditorManager;
