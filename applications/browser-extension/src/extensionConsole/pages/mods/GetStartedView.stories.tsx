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
import { type ComponentMeta, type ComponentStory } from "@storybook/react";
import { configureStore } from "@reduxjs/toolkit";
import { persistReducer } from "redux-persist";
import modsPageSlice, { persistModsConfig } from "./modsPageSlice";
import { appApi } from "@/data/service/api";
import GetStartedView from "./GetStartedView";
import { Provider } from "react-redux";
import { authSlice, persistAuthConfig } from "@/auth/authSlice";
import { rest } from "msw";
import { modDefinitionsSlice } from "../../../modDefinitions/modDefinitionsSlice";
import { valueToAsyncCacheState } from "../../../utils/asyncStateUtils";
import { API_PATHS } from "@/data/service/urlPaths";
import { publicSharingDefinitionFactory } from "../../../testUtils/factories/registryFactories";
import { modDefinitionFactory } from "../../../testUtils/factories/modDefinitionFactories";
import { Milestones } from "@/data/model/UserMilestone";

export default {
  title: "ModsPage/GetStartedView",
  component: GetStartedView,
} as ComponentMeta<typeof GetStartedView>;

function optionsStore(initialState?: UnknownObject) {
  return configureStore({
    reducer: {
      modsPage: persistReducer(persistModsConfig, modsPageSlice.reducer),
      modDefinitions: modDefinitionsSlice.reducer,
      auth: persistReducer(persistAuthConfig, authSlice.reducer),
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware(getDefaultMiddleware) {
      return getDefaultMiddleware().concat(appApi.middleware);
    },
    preloadedState: initialState,
  });
}

const testMod = modDefinitionFactory({
  sharing: publicSharingDefinitionFactory(),
});

const Template: ComponentStory<typeof GetStartedView> = (args) => (
  <Provider
    store={optionsStore({
      auth: {
        milestones: [
          {
            key: Milestones.FIRST_TIME_PUBLIC_MOD_ACTIVATION,
            metadata: { blueprintId: testMod.metadata.id },
          },
        ],
      },
      recipes: valueToAsyncCacheState([testMod]),
    })}
  >
    <GetStartedView {...args} />
  </Provider>
);

export const Default = Template.bind({});
Default.args = {
  width: 800,
  height: 500,
};

export const ActivateMod = Template.bind({});
ActivateMod.args = {
  width: 800,
  height: 500,
};

ActivateMod.parameters = {
  msw: {
    handlers: [
      rest.get(
        API_PATHS.MARKETPLACE_LISTINGS,
        async (request, result, context) =>
          result(
            context.json([
              {
                package: {
                  name: testMod.metadata.id,
                  verbose_name: testMod.metadata.name,
                },
              },
            ]),
          ),
      ),
    ],
  },
};
