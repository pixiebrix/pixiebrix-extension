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

import { appApi } from "@/data/service/api";
import { createListenerMiddleware, isAnyOf } from "@reduxjs/toolkit";
import { syncRemoteModDefinitions } from "./modDefinitionsSlice";

const apiEndpoints = appApi.endpoints;

const modDefinitionsListenerMiddleware = createListenerMiddleware();
modDefinitionsListenerMiddleware.startListening({
  matcher: isAnyOf(
    apiEndpoints.createModDefinition.matchFulfilled,
    apiEndpoints.updateModDefinition.matchFulfilled,
    apiEndpoints.createPackage.matchFulfilled,
    apiEndpoints.updatePackage.matchFulfilled,
    apiEndpoints.deletePackage.matchFulfilled,
  ),
  effect(action, { dispatch }) {
    void dispatch(syncRemoteModDefinitions());
  },
});

export const modDefinitionsMiddleware =
  modDefinitionsListenerMiddleware.middleware;
