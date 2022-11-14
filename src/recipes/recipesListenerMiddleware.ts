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

import { appApi } from "@/services/api";
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { refreshRecipes } from "./recipesSlice";

const apiEndpoints = appApi.endpoints;

const recipesListenerMiddleware = createListenerMiddleware();
recipesListenerMiddleware.startListening({
  matcher: isAnyOf(
    apiEndpoints.createRecipe.matchFulfilled,
    apiEndpoints.updateRecipe.matchFulfilled,
    apiEndpoints.createPackage.matchFulfilled,
    apiEndpoints.updatePackage.matchFulfilled,
    apiEndpoints.deletePackage.matchFulfilled
  ),
  effect(action, { dispatch }) {
    void dispatch(refreshRecipes());
  },
});

export const recipesMiddleware = recipesListenerMiddleware.middleware;
