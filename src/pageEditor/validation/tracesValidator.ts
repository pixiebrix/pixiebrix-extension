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
import { getErrorMessage } from "@/errors/errorHelpers";
import runtimeSlice from "@/pageEditor/slices/runtimeSlice";
import {
  selectActiveElement,
  selectErrorMap,
} from "@/pageEditor/slices/editorSelectors";
import { selectTraceErrors } from "@/pageEditor/slices/runtimeSelectors";
import { actions as editorActions } from "@/pageEditor/slices/editorSlice";
import { Validator, ValidatorEffect } from "./validationTypes";

class TracesValidator implements Validator {
  static namespace = "traces";

  actionCreator = runtimeSlice.actions.setExtensionTrace;

  effect: ValidatorEffect = async (action, listenerApi) => {
    const state = listenerApi.getState();
    const activeElement = selectActiveElement(state);
    const activeElementId = activeElement.uuid;
    if (activeElementId !== action.payload.extensionId) {
      return;
    }

    const errorMap = selectErrorMap(state);

    /**
     * Node IDs that have errors since the last run
     */
    const lastNodesWithErrors: UUID[] = Object.entries(errorMap)
      .filter(([, errorInfo]) =>
        errorInfo?.errors?.some(
          (x) => x.namespace === TracesValidator.namespace
        )
      )
      .map(([nodeId]) => nodeId as UUID);

    // Applying trace errors to the error state
    const traceErrors = selectTraceErrors(state);

    const activeElementErrors = traceErrors.filter(
      ({ extensionId }) => extensionId === activeElementId
    );
    const nodesWithErrors = new Set<UUID>();
    for (const traceError of activeElementErrors) {
      nodesWithErrors.add(traceError.blockInstanceId);
      listenerApi.dispatch(
        editorActions.setNodeError({
          nodeId: traceError.blockInstanceId,
          namespace: TracesValidator.namespace,
          message: getErrorMessage(traceError.error),
        })
      );
    }

    // Clear the errors from the last run for the blocks that no longer have errors
    for (const nodeId of lastNodesWithErrors.filter(
      (x) => !nodesWithErrors.has(x)
    )) {
      listenerApi.dispatch(
        editorActions.clearNodeError({
          nodeId,
          namespace: TracesValidator.namespace,
        })
      );
    }
  };
}

export default TracesValidator;
