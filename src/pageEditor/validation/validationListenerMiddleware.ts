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

import { UUID } from "@/core";
import { TraceError } from "@/telemetry/trace";
import { createListenerMiddleware } from "@reduxjs/toolkit";
import { uniq } from "lodash";
import { RootState } from "@/pageEditor/pageEditorTypes";
import {
  selectActiveElementId,
  selectErrorMap,
} from "../slices/editorSelectors";
import { selectTraceErrors } from "../slices/runtimeSelectors";
import runtimeSlice from "../slices/runtimeSlice";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { getErrorMessage } from "@/errors/errorHelpers";

const validationListenerMiddleware = createListenerMiddleware();
validationListenerMiddleware.startListening({
  actionCreator: runtimeSlice.actions.setExtensionTrace,
  effect(action, listenerApi) {
    const state: RootState = listenerApi.getState() as RootState;
    const activeElementId = selectActiveElementId(state);
    if (activeElementId !== action.payload.extensionId) {
      return;
    }

    console.log("validationMiddleware.setExtensionTrace");

    // Applying trace errors to the error state
    const errorMap = selectErrorMap(state);
    const traceErrors = selectTraceErrors(state);

    const nodesWithErrors: UUID[] = Object.keys(errorMap) as UUID[];
    const traceErrorsMap: Record<UUID, TraceError> = {};
    const activeElementErrors = traceErrors.filter(
      ({ extensionId }) => extensionId === activeElementId
    );
    for (const traceError of activeElementErrors) {
      nodesWithErrors.push(traceError.blockInstanceId);
      traceErrorsMap[traceError.blockInstanceId] = traceError;
    }

    for (const nodeId of uniq(nodesWithErrors)) {
      const traceError = traceErrorsMap[nodeId];
      const nodeError = errorMap[nodeId];

      if (traceError == null) {
        if (nodeError?.message != null) {
          listenerApi.dispatch(
            editorActions.setError({
              nodeId,
              nodeError: null,
            })
          );
        }
      } else {
        listenerApi.dispatch(
          editorActions.setError({
            nodeId,
            nodeError: getErrorMessage(traceError.error),
          })
        );
      }
    }
  },
});

export default validationListenerMiddleware.middleware;
