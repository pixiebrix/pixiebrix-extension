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
  selectActiveModComponentFormState,
  selectActiveModId,
  selectAllDeletedModComponentIds,
  selectExpandedModId,
  selectModComponentFormStates,
} from "@/pageEditor/store/editor/editorSelectors";
import type { EmptyObject } from "type-fest";
import { uniqBy } from "lodash";
import { isInternalRegistryId } from "@/utils/registryUtils";

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
// XXX: in production, should we be attempting to auto-fix these invariants?
export function assertEditorInvariants(state: EditorRootState): void {
  // Assert that a mod and mod component item cannot be selected at the same time
  const activeModId = selectActiveModId(state);
  const activeModComponent = selectActiveModComponentFormState(state);

  if (
    activeModId &&
    activeModComponent &&
    activeModId !== activeModComponent?.modMetadata.id &&
    // When saving, the activeModId and activeModComponent.modMetadata.id aren't updated at the same time.
    !isInternalRegistryId(activeModId)
  ) {
    // Should we dispatch(actions.setActiveModComponentId(null))
    // Would need to change the behavior of the action to handle null
    throw new InvariantViolationError(
      "activeModComponent is not a part of the activeMod",
    );
  }

  // Assert that the expanded mod must correspond to the selected mod or mod component
  const expandedModId = selectExpandedModId(state);
  if (expandedModId && activeModId !== expandedModId) {
    throw new InvariantViolationError(
      "expandedModId does not match active mod",
    );
  }

  const modComponentFormStates = selectModComponentFormStates(state);

  // Assert each mod component has at most one form state. In the future, this could be enforced by storing form
  // states in a record instead of an array.
  if (
    uniqBy(modComponentFormStates, (x) => x.uuid).length !==
    modComponentFormStates.length
  ) {
    throw new InvariantViolationError(
      "modComponentFormStates contains duplicate mod component ids",
    );
  }

  // Assert that mod component deletion flags are consistent with modComponentFormStates. In the future, this could
  // be enforced by instead tracking an isDeleted flag on the form state.
  const deletedModComponentIds = selectAllDeletedModComponentIds(state);
  if (
    modComponentFormStates.some(({ uuid }) => deletedModComponentIds.has(uuid))
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

    try {
      assertEditorInvariants(storeAPI.getState());
    } catch (error) {
      throw new Error(`Action violated invariant: ${action.type}`, {
        cause: error,
      });
    }

    return result;
  };

export default editorInvariantMiddleware;
