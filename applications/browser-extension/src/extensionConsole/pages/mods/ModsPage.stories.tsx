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

import React from "react";
import { type ComponentStory, type ComponentMeta } from "@storybook/react";
import ModsPage from "./ModsPage";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { authSlice } from "../../../auth/authSlice";
import modsPageSlice from "./modsPageSlice";
import modComponentSlice from "../../../store/modComponents/modComponentSlice";
import { modModalsSlice } from "./modals/modModalsSlice";
import { appApi } from "../../../data/service/api";
import { modDefinitionsSlice } from "../../../modDefinitions/modDefinitionsSlice";

export default {
  title: "ModsPage/ModsPage",
  component: ModsPage,
} as ComponentMeta<typeof ModsPage>;

function optionsStore(initialState?: UnknownObject) {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      modsPage: modsPageSlice.reducer,
      options: modComponentSlice.reducer,
      modModals: modModalsSlice.reducer,
      modDefinitions: modDefinitionsSlice.reducer,
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware(getDefaultMiddleware) {
      return getDefaultMiddleware().concat(appApi.middleware);
    },
    ...(initialState ?? { preloadedState: initialState }),
  });
}

const Template: ComponentStory<typeof ModsPage> = (args) => (
  <Provider store={optionsStore()}>
    <ModsPage {...args} />
  </Provider>
);

export const Default = Template.bind({});
Default.parameters = {
  // Initial state is a loading state. Our loader is not compatible with Storyshots
  storyshots: false,
};
