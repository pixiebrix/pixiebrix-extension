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
import { configureStore } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import blueprintsSlice, {
  persistBlueprintsConfig,
} from "@/options/pages/blueprints/blueprintsSlice";
import { appApi } from "@/services/api";
import GetStartedView from "@/options/pages/blueprints/GetStartedView";
import { Provider } from "react-redux";
import OnboardingView from "@/options/pages/blueprints/onboardingView/OnboardingView";
import { authSlice, persistAuthConfig } from "@/auth/authSlice";
import { rest } from "msw";
import { recipesSlice } from "@/recipes/recipesSlice";

export default {
  title: "Onboarding/GetStartedView",
  component: GetStartedView,
} as ComponentMeta<typeof OnboardingView>;

function optionsStore(initialState?: any) {
  return configureStore({
    reducer: {
      blueprints: persistReducer(
        persistBlueprintsConfig,
        blueprintsSlice.reducer
      ),
      recipes: recipesSlice.reducer,
      auth: persistReducer(persistAuthConfig, authSlice.reducer),
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware(getDefaultMiddleware) {
      /* eslint-disable unicorn/prefer-spread -- use .concat for proper type inference */
      return getDefaultMiddleware().concat(appApi.middleware);
      /* eslint-enable unicorn/prefer-spread */
    },
    preloadedState: initialState,
  });
}

const Template: ComponentStory<typeof GetStartedView> = (args) => (
  <Provider store={optionsStore({ auth: { milestones: [] } })}>
    <GetStartedView {...args} />
  </Provider>
);

export const Default = Template.bind({});
Default.args = {
  width: 800,
  height: 500,
};

Default.parameters = {
  msw: {
    handlers: [
      rest.get("/api/me/", (request, result, context) =>
        // State is blank for unauthenticated users
        result(context.json({}))
      ),
    ],
  },
};
