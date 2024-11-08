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

import { localStorage } from "redux-persist-webextension-storage";
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type StorageInterface } from "../../store/StorageInterface";
import { revertAll } from "../../store/commonActions";
import { type IntegrationConfig } from "../integrationTypes";
import { type UUID } from "../../types/stringTypes";
import { createMigrate } from "redux-persist";
import { migrations } from "./integrationsMigrations";

export interface IntegrationsState {
  /**
   * Map of integration configs by their UUIDs
   */
  configured: Record<string, IntegrationConfig>;
}

export type ServicesRootState = {
  integrations: IntegrationsState;
};

export const initialState: IntegrationsState = {
  configured: {},
};

const integrationsSlice = createSlice({
  /* eslint-disable security/detect-object-injection
  -- The object access should be safe because type-checker enforced UUID */
  name: "integrations",
  initialState,
  reducers: {
    deleteIntegrationConfig(
      state,
      { payload: { id } }: PayloadAction<{ id: UUID }>,
    ) {
      delete state.configured[id];
    },
    upsertIntegrationConfig(
      state,
      { payload: integrationConfig }: PayloadAction<IntegrationConfig>,
    ) {
      state.configured[integrationConfig.id] = integrationConfig;
    },
  },
  extraReducers(builder) {
    builder.addCase(revertAll, () => initialState);
  },
  /* eslint-enable security/detect-object-injection  */
});

export const persistIntegrationsConfig = {
  // Caution: changing this storage key requires async persistence migrations, which are not currently supported
  key: "servicesOptions",
  // Change the type of localStorage to our overridden version so that it can be exported
  // See: @/store/StorageInterface.ts
  storage: localStorage as StorageInterface,
  version: 2,
  migrate: createMigrate(migrations, { debug: Boolean(process.env.DEBUG) }),
};

export default integrationsSlice;
