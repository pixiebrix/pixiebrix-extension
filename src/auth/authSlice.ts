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

import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { anonAuth } from "./authConstants";
import { AuthState } from "./authTypes";
import { localStorage } from "redux-persist-webextension-storage";
import { isEmpty } from "lodash";

export const authSlice = createSlice({
  name: "auth",
  initialState: anonAuth,
  reducers: {
    setAuth: (state, { payload }: PayloadAction<AuthState>) => ({
      ...payload,
      scope: isEmpty(payload.scope) ? null : payload.scope,
      flags: Array.isArray(payload.flags) ? payload.flags : [],
      organizations: Array.isArray(payload.organizations)
        ? payload.organizations
        : [],
      groups: Array.isArray(payload.groups) ? payload.groups : [],
    }),
  },
});

// TODO refactor to use token.ts/updateUserData
// Current approach is not ideal, AuthState is cached along with UserDate (which is used by background script).
export const persistAuthConfig = {
  key: "authOptions",
  storage: localStorage,
};

export const authActions = authSlice.actions;
