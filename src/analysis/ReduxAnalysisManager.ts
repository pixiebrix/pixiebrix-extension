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
import { type RootState } from "@/pageEditor/store/editor/pageEditorTypes";
import { debounce } from "lodash";
import { type UUID } from "@/types/stringTypes";
import AsyncAnalysisQueue from "./asyncAnalysisQueue";
import { serializeError } from "serialize-error";
import { ReusableAbortController } from "abort-utils";
import { selectActiveModComponentFormState } from "@/pageEditor/store/editor/editorSelectors";

type AnalysisEffect = ListenerEffect<
  AnyAction,
  RootState,
  ThunkDispatch<unknown, unknown, AnyAction>
>;

type AnalysisListenerConfig =
  | {
      actionCreator: TypedActionCreator<string>;
    }
  | {
      matcher: MatchFunction<AnyAction>;
    };

type EffectConfig<TAnalysis extends Analysis = Analysis> = {
  postAnalysisAction?: (
    analysis: TAnalysis,
    modComponentId: UUID,
    listenerApi: ListenerEffectAPI<
      RootState,
      ThunkDispatch<unknown, unknown, AnyAction>
    >,
  ) => void;
  debounce?: number;
};

type AnalysisFactory<
  TAnalysis extends Analysis,
  TAction = AnyAction,
  TState = unknown,
> = (action: TAction, state: TState) => TAnalysis | null | Promise<TAnalysis>;

class ReduxAnalysisManager {
  private readonly listenerMiddleware = createListenerMiddleware();
  public get middleware() {
    return this.listenerMiddleware.middleware;
  }

  private readonly queue = new AsyncAnalysisQueue();

  public registerAnalysisEffect<TAnalysis extends Analysis>(
    analysisFactory: AnalysisFactory<TAnalysis>,
    listenerConfig: AnalysisListenerConfig,
    effectConfig?: EffectConfig<TAnalysis>,
  ) {
    const abortController = new ReusableAbortController();

    const effect: AnalysisEffect = async (action, listenerApi) => {
      // Abort the previous analysis run, if running
      abortController.abortAndReset();

      // Capture state at the moment of the action
      const state = listenerApi.getState();

      const task = async () => {
        if (abortController.signal.aborted) {
          return;
        }

        const activeModComponentFormState =
          selectActiveModComponentFormState(state);
        if (activeModComponentFormState == null) {
          return;
        }

        const analysis = await analysisFactory(action, state);
        if (!analysis) {
          return;
        }

        const modComponentId = activeModComponentFormState.uuid;

        listenerApi.dispatch(
          analysisSlice.actions.startAnalysis({
            modComponentId,
            analysisId: analysis.id,
          }),
        );

        try {
          await analysis.run(activeModComponentFormState);
        } catch (error) {
          listenerApi.dispatch(
            analysisSlice.actions.failAnalysis({
              modComponentId,
              analysisId: analysis.id,
              error: serializeError(error),
            }),
          );
          return;
        }

        listenerApi.dispatch(
          analysisSlice.actions.finishAnalysis({
            modComponentId,
            analysisId: analysis.id,
            annotations: analysis.getAnnotations(),
          }),
        );

        if (effectConfig?.postAnalysisAction) {
          effectConfig.postAnalysisAction(
            analysis,
            modComponentId,
            listenerApi,
          );
        }
      };

      this.queue.enqueue(task);
    };

    this.listenerMiddleware.startListening({
      ...listenerConfig,
      effect: effectConfig?.debounce
        ? debounce(effect, effectConfig.debounce, {
            leading: false,
            trailing: true,
          })
        : effect,
    } as never);
  }
}

export default ReduxAnalysisManager;
