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
import { RootState } from "@/pageEditor/pageEditorTypes";
import {
  selectActiveElement,
  selectErrorMap,
} from "@/pageEditor/slices/editorSelectors";
import { selectTraceErrors } from "@/pageEditor/slices/runtimeSelectors";
import runtimeSlice from "@/pageEditor/slices/runtimeSlice";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { getErrorMessage } from "@/errors/errorHelpers";
import RenderersValidator from "./renderersValidator";

const validationListenerMiddleware = createListenerMiddleware();

// Trace errors
validationListenerMiddleware.startListening({
  actionCreator: runtimeSlice.actions.setExtensionTrace,
  async effect(action, listenerApi) {
    const state: RootState = listenerApi.getState() as RootState;
    const activeElement = selectActiveElement(state);
    const activeElementId = activeElement.uuid;
    if (activeElementId !== action.payload.extensionId) {
      return;
    }

    // Clear the errors from the last run
    // TODO: find a better way for this
    const errorMap = selectErrorMap(state);
    const nodesWithTraceErrors: UUID[] = Object.entries(errorMap)
      .filter(([, error]) => error.nodeErrors?.trace != null)
      .map(([nodeId]) => nodeId as UUID);

    for (const nodeId of nodesWithTraceErrors) {
      listenerApi.dispatch(
        editorActions.setNodeError({
          nodeId,
          namespace: "trace",
          message: null,
        })
      );
    }

    // Applying trace errors to the error state
    const traceErrors = selectTraceErrors(state);

    const traceErrorsMap: Record<UUID, TraceError> = {};
    const activeElementErrors = traceErrors.filter(
      ({ extensionId }) => extensionId === activeElementId
    );
    for (const traceError of activeElementErrors) {
      traceErrorsMap[traceError.blockInstanceId] = traceError;
    }

    for (const [nodeId, traceError] of Object.entries(traceErrorsMap)) {
      listenerApi.dispatch(
        editorActions.setNodeError({
          // @ts-expect-error -- nodeId is UUID
          nodeId,
          namespace: "trace",
          message: getErrorMessage(traceError.error),
        })
      );
    }
  },
});

// Renderers
validationListenerMiddleware.startListening(new RenderersValidator());

export default validationListenerMiddleware.middleware;
