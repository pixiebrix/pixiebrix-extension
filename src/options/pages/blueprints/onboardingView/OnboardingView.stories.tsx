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
import { ComponentStory, ComponentMeta } from "@storybook/react";
import OnboardingView from "@/options/pages/blueprints/onboardingView/OnboardingView";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { appApi } from "@/services/api";
import { persistReducer } from "redux-persist";
import blueprintsSlice, {
  persistBlueprintsConfig,
} from "@/options/pages/blueprints/blueprintsSlice";

export default {
  title: "Blueprints/OnboardingView",
  component: OnboardingView,
  argTypes: {
    onboardingType: {
      options: ["default", "hasDeployments", "restricted", "hasTeamBlueprints"],
      control: {
        type: "select",
      },
    },
    filter: {
      options: ["active", "public", "personal", undefined],
      control: {
        type: "select",
      },
    },
  },
} as ComponentMeta<typeof OnboardingView>;

function optionsStore(initialState?: any) {
  return configureStore({
    reducer: {
      blueprints: persistReducer(
        persistBlueprintsConfig,
        blueprintsSlice.reducer
      ),
      [appApi.reducerPath]: appApi.reducer,
    },
    preloadedState: initialState,
  });
}

const Template: ComponentStory<typeof OnboardingView> = (args) => (
  <Provider store={optionsStore()}>
    <OnboardingView {...args} />
  </Provider>
);

export const Default = Template.bind({});
Default.args = {
  onboardingType: "default",
};
