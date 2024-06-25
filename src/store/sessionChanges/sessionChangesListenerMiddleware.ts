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

import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { type SessionRootState } from "@/pageEditor/slices/sessionSliceTypes";
import { sessionChangesActions } from "@/store/sessionChanges/sessionChangesSlice";
import { actions } from "@/pageEditor/slices/editorSlice";
import extensionsSlice from "@/store/extensionsSlice";

const sessionChangesListenerMiddleware = createListenerMiddleware();
sessionChangesListenerMiddleware.startListening({
  matcher: isAnyOf(
    actions.syncModComponentFormState,
    actions.addNode,
    actions.moveNode,
    actions.removeNode,
    actions.resetInstalled,
    actions.removeModComponentFormState,
    actions.editRecipeMetadata,
    actions.editRecipeOptionsDefinitions,
    actions.editRecipeOptionsValues,
    actions.resetMetadataAndOptionsForRecipe,
    actions.addModComponentFormStateToMod,
    actions.removeModComponentFormStateFromMod,
    actions.removeRecipeData,

    extensionsSlice.actions.activateStandaloneModDefinition,
    extensionsSlice.actions.removeModComponent,
    extensionsSlice.actions.removeModComponents,
    extensionsSlice.actions.setModComponentMetadata,
    extensionsSlice.actions.activateMod,
    extensionsSlice.actions.removeModById,
  ),
  effect(action, { dispatch, getState }) {
    const { sessionId } = (getState() as SessionRootState).session;
    dispatch(sessionChangesActions.setSessionChanges({ sessionId }));
  },
});

export const sessionChangesMiddleware =
  sessionChangesListenerMiddleware.middleware;
