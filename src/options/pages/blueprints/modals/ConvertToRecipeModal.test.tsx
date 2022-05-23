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

import { anonAuth } from "@/auth/authConstants";
import { authSlice } from "@/auth/authSlice";
import { appApi } from "@/services/api";
import extensionsSlice from "@/store/extensionsSlice";
import settingsSlice from "@/store/settingsSlice";
import { cloudExtensionFactory, extensionFactory } from "@/testUtils/factories";
import { render } from "@/testUtils/testHelpers";
import { configureStore } from "@reduxjs/toolkit";
import React from "react";
import { blueprintModalsSlice } from "./blueprintModalsSlice";
import ConvertToRecipeModal from "./ConvertToRecipeModal";

test("renders a modal", () => {
  const extension = cloudExtensionFactory();

  const rendered = render(<ConvertToRecipeModal />, {
    setupRedux(dispatch) {
      dispatch(authSlice.actions.setAuth(anonAuth));
      dispatch(
        extensionsSlice.actions.installCloudExtension({
          extension,
        })
      );
      dispatch(
        blueprintModalsSlice.actions.setShareContext({
          extensionId: extension.id,
        })
      );
    },
    customStore: configureStore({
      reducer: {
        auth: authSlice.reducer,
        settings: settingsSlice.reducer,
        options: extensionsSlice.reducer,
        blueprintModals: blueprintModalsSlice.reducer,
        [appApi.reducerPath]: appApi.reducer,
      },
    }),
  });
  expect(rendered.asFragment()).toMatchSnapshot();
});
