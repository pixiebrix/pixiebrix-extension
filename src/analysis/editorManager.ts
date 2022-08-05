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
import {
  MatchFunction,
  TypedActionCreator,
} from "@reduxjs/toolkit/dist/listenerMiddleware/types";
import { Analysis } from "./analysisTypes";

type AnalysisEffectConfig =
  | {
      actionCreator: TypedActionCreator<any>;
    }
  | {
      matcher: MatchFunction<AnyAction>;
    };

type AnalysisFactory<TAction = AnyAction, TState = unknown> = (
  action: TAction,
  state: TState
) => Analysis | null;

class EditorManager {
  private readonly listenerMiddleware = createListenerMiddleware();
  public get middleware() {
    return this.listenerMiddleware.middleware;
  }

  public registerAnalysisEffect(
    analysisFactory: AnalysisFactory,
    config: AnalysisEffectConfig
  ) {
    const effect: ValidatorEffect = async (action, listenerApi) => {
      const state = listenerApi.getState();
      const activeElement = selectActiveElement(state);
      if (activeElement == null) {
        return;
      }

      const analysis = analysisFactory(action, state);
      if (!analysis) {
        return;
      }

      const activeElementId = activeElement.uuid;

      listenerApi.dispatch(
        analysisSlice.actions.startAnalysis({
          extensionId: activeElementId,
          analysisId: analysis.id,
        })
      );

      await analysis.run(activeElement);

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
    } as any);
  }
}

export default EditorManager;
