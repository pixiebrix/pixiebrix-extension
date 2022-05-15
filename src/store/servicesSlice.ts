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
import { RawServiceConfiguration, UUID } from "@/core";
import { localStorage } from "redux-persist-webextension-storage";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { unset } from "lodash";

export interface ServicesState {
  configured: Record<string, RawServiceConfiguration>;
}

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

      unset(state.configured, id);
      return state;
    },
    updateServiceConfig(state, { payload: { id, serviceId, label, config } }) {
      // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- branding with nominal type
      state.configured[id] = {
        id,
        serviceId,
        label,
        config,
      } as RawServiceConfiguration;
    },
    resetServices(state) {
      state.configured = {};
    },
  },

  /* eslint-enable security/detect-object-injection */
});

export const persistServicesConfig = {
  key: "servicesOptions",
  storage: localStorage,
};

export default servicesSlice;
