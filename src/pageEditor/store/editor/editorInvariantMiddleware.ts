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

import type { AnyAction, Dispatch, Middleware } from "@reduxjs/toolkit";
import { type EditorRootState } from "@/pageEditor/store/editor/pageEditorTypes";
import {
  selectActiveModComponentId,
  selectActiveModId,
  selectAllDeletedModComponentIds,
  selectCurrentModId,
  selectExpandedModId,
  selectModComponentFormStates,
} from "@/pageEditor/store/editor/editorSelectors";
import type { EmptyObject } from "type-fest";

class InvariantViolationError extends Error {
  override name = "InvariantViolationError";

  constructor(message: string) {
    super(`Invariant Violation: ${message}`);
  }
}

/**
 * Asserts invariants about the editor state that can't be enforced by TypeScript.
 *
 * Prefer structuring editorSlice state in a way that invariants are enforced by the type system (e.g., by eliminating
 * data duplication, using union types to enforce correlated props, etc.)
 *
 * @throws InvariantViolationError if any of the invariants are violated
 * @see editorInvariantMiddleware
 */
export function assertEditorInvariants(state: EditorRootState): void {
  // Assert that a mod and mod component item cannot be selected at the same time
  if (selectActiveModId(state) && selectActiveModComponentId(state)) {
    throw new InvariantViolationError(
      "activeModId and activeModComponentId are both set",
    );
  }

  // Assert that the expanded mod must correspond to the selected mod or mod component
  const expandedModId = selectExpandedModId(state);
  if (expandedModId && selectCurrentModId(state) !== expandedModId) {
    throw new InvariantViolationError(
      "expandedModId does not match active mod/mod component",
    );
  }

  // Assert that mod component deletion flags are consistent with modComponentFormStates
  const deletedModComponentIds = selectAllDeletedModComponentIds(state);
  if (
    selectModComponentFormStates(state).some(({ uuid }) =>
      deletedModComponentIds.has(uuid),
    )
  ) {
    throw new InvariantViolationError(
      "modComponentFormStates includes deleted mod component",
    );
  }
}

/**
 * Middleware that enforces invariants about the state of the editor that can't be guaranteed by TypeScript.
 *
 * @since 2.1.6
 */
const editorInvariantMiddleware: Middleware<EmptyObject, EditorRootState> =
  (storeAPI) => (next: Dispatch) => (action: AnyAction) => {
    const result = next(action);
    assertEditorInvariants(storeAPI.getState());
    return result;
  };

export default editorInvariantMiddleware;
