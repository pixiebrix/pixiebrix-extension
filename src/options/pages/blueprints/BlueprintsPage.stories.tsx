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

import React from "react";
import { type ComponentStory, type ComponentMeta } from "@storybook/react";
import BlueprintsPage from "@/options/pages/blueprints/BlueprintsPage";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { authSlice } from "@/auth/authSlice";
import blueprintsSlice from "@/options/pages/blueprints/blueprintsSlice";
import extensionsSlice from "@/store/extensionsSlice";
import { blueprintModalsSlice } from "@/options/pages/blueprints/modals/blueprintModalsSlice";
import { appApi } from "@/services/api";
import { recipesSlice } from "@/recipes/recipesSlice";

export default {
  title: "Blueprints/BlueprintsPage",
  component: BlueprintsPage,
} as ComponentMeta<typeof BlueprintsPage>;

function optionsStore(initialState?: any) {
  return configureStore({
    reducer: {
      auth: authSlice.reducer,
      blueprints: blueprintsSlice.reducer,
      options: extensionsSlice.reducer,
      blueprintModals: blueprintModalsSlice.reducer,
      recipes: recipesSlice.reducer,
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware(getDefaultMiddleware) {
      /* eslint-disable unicorn/prefer-spread -- use .concat for proper type inference */
      return getDefaultMiddleware().concat(appApi.middleware);
      /* eslint-enable unicorn/prefer-spread */
    },
    ...(initialState ?? { preloadedState: initialState }),
  });
}

const Template: ComponentStory<typeof BlueprintsPage> = (args) => (
  <Provider store={optionsStore()}>
    <BlueprintsPage {...args} />
  </Provider>
);

export const Default = Template.bind({});
Default.parameters = {
  // Initial state is a loading state. Our loader is not compatible with Storyshots
  storyshots: false,
};
