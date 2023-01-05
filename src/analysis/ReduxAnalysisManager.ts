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

import { selectActiveElement } from "@/pageEditor/slices/editorSelectors";
import {
  type AnyAction,
  type ListenerEffect,
  type ThunkDispatch,
  createListenerMiddleware,
} from "@reduxjs/toolkit";
import analysisSlice from "./analysisSlice";
import {
  type ListenerEffectAPI,
  type MatchFunction,
  type TypedActionCreator,
} from "@reduxjs/toolkit/dist/listenerMiddleware/types";
import { type Analysis } from "./analysisTypes";
import { type RootState } from "@/pageEditor/pageEditorTypes";
import { debounce } from "lodash";
import { type UUID } from "@/core";

type AnalysisEffect = ListenerEffect<
  AnyAction,
  RootState,
  ThunkDispatch<unknown, unknown, AnyAction>
>;

type AnalysisListenerConfig =
  | {
      actionCreator: TypedActionCreator<any>;
    }
  | {
      matcher: MatchFunction<AnyAction>;
    };
type EffectConfig<TAnalysis extends Analysis = Analysis> = {
  postAnalysisAction?: (
    analysis: TAnalysis,
    extensionId: UUID,
    listenerApi: ListenerEffectAPI<
      RootState,
      ThunkDispatch<unknown, unknown, AnyAction>
    >
  ) => void;
  debounce?: number;
  runAsynchronously?: boolean;
};

type AnalysisFactory<
  TAnalysis extends Analysis,
  TAction = AnyAction,
  TState = unknown
> = (action: TAction, state: TState) => TAnalysis | null;

class ReduxAnalysisManager {
  private readonly listenerMiddleware = createListenerMiddleware();
  public get middleware() {
    return this.listenerMiddleware.middleware;
  }

  public registerAnalysisEffect<TAnalysis extends Analysis>(
    analysisFactory: AnalysisFactory<TAnalysis>,
    listenerConfig: AnalysisListenerConfig,
    effectConfig?: EffectConfig<TAnalysis>
  ) {
    const effect: AnalysisEffect = async (action, listenerApi) => {
      const state = listenerApi.getState();
      const activeElement = selectActiveElement(state);
      if (activeElement == null) {
        return;
      }

      const analysis = analysisFactory(action, state);
      if (!analysis) {
        return;
      }

      const extensionId = activeElement.uuid;

      listenerApi.dispatch(
        analysisSlice.actions.startAnalysis({
          extensionId,
          analysisId: analysis.id,
        })
      );

      const executor = async () => {
        await analysis.run(activeElement);

        listenerApi.dispatch(
          analysisSlice.actions.finishAnalysis({
            extensionId,
            analysisId: analysis.id,
            annotations: analysis.getAnnotations(),
          })
        );

        if (effectConfig?.postAnalysisAction) {
          effectConfig.postAnalysisAction(analysis, extensionId, listenerApi);
        }
      };

      if (effectConfig?.runAsynchronously) {
        setTimeout(executor, 100);
      } else {
        void executor();
      }
    };

    this.listenerMiddleware.startListening({
      ...listenerConfig,
      effect: effectConfig?.debounce
        ? debounce(effect, effectConfig.debounce, {
            leading: false,
            trailing: true,
          })
        : effect,
    } as any);
  }
}

export default ReduxAnalysisManager;
