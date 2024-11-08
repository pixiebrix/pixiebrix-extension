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
import { OnboardingViewContent } from "@/extensionConsole/pages/mods/onboardingView/OnboardingView";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { appApi } from "@/data/service/api";
import { persistReducer } from "redux-persist";
import modsPageSlice, {
  persistModsConfig,
} from "@/extensionConsole/pages/mods/modsPageSlice";

export default {
  title: "Blueprints/OnboardingView",
  component: OnboardingViewContent,
  argTypes: {
    isLoading: {
      control: {
        type: "boolean",
      },
    },
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
} as ComponentMeta<typeof OnboardingViewContent>;

function optionsStore() {
  return configureStore({
    reducer: {
      mods: persistReducer(persistModsConfig, modsPageSlice.reducer),
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware(getDefaultMiddleware) {
      return getDefaultMiddleware().concat(appApi.middleware);
    },
  });
}

const Template: ComponentStory<typeof OnboardingViewContent> = (args) => (
  <Provider store={optionsStore()}>
    <OnboardingViewContent {...args} />
  </Provider>
);

export const Default = Template.bind({});
Default.args = {
  isLoading: false,
  onboardingType: "default",
};
