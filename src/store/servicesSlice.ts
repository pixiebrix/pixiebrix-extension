/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { type StorageInterface } from "@/store/StorageInterface";
import { revertAll } from "@/store/commonActions";
import { type RawServiceConfiguration } from "@/types/serviceTypes";
import { type UUID } from "@/types/stringTypes";

export interface ServicesState {
  configured: Record<string, RawServiceConfiguration>;
}

export type ServicesRootState = {
  services: ServicesState;
};

const initialServicesState: ServicesState = {
  configured: {},
};

const servicesSlice = createSlice({
  /* The object access in servicesSlice and optionsSlice should be safe because type-checker enforced UUID */
  /* eslint-disable security/detect-object-injection */

  name: "services",
  initialState: initialServicesState,
  reducers: {
    deleteServiceConfig(
      state,
      { payload: { id } }: PayloadAction<{ id: UUID }>
    ) {
      if (!state.configured[id]) {
        throw new Error(`Service configuration ${id} does not exist`);
      }

      delete state.configured[id];
      return state;
    },
    updateServiceConfig(state, { payload: { id, serviceId, label, config } }) {
      state.configured[id] = {
        id,
        serviceId,
        label,
        config,
      } as RawServiceConfiguration;
    },
  },
  extraReducers(builder) {
    builder.addCase(revertAll, () => initialServicesState);
  },
  /* eslint-enable security/detect-object-injection */
});

export const persistServicesConfig = {
  key: "servicesOptions",
  // Change the type of localStorage to our overridden version so that it can be exported
  // See: @/store/StorageInterface.ts
  storage: localStorage as StorageInterface,
  version: 1,
};

export default servicesSlice;
