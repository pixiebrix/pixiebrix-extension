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
import modsPageSlice, {
  persistModsConfig,
} from "@/extensionConsole/pages/mods/modsPageSlice";
import { appApi } from "@/data/service/api";
import GetStartedView from "@/extensionConsole/pages/mods/GetStartedView";
import { Provider } from "react-redux";
import { authSlice, persistAuthConfig } from "@/auth/authSlice";
import { rest } from "msw";
import { modDefinitionsSlice } from "@/modDefinitions/modDefinitionsSlice";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { valueToAsyncCacheState } from "@/utils/asyncStateUtils";
import { type ApiVersion } from "@/types/runtimeTypes";
import { type Timestamp } from "@/types/stringTypes";
import { validateRegistryId } from "@/types/helpers";
import { DefinitionKinds } from "@/types/registryTypes";

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

const testRecipe = {
  metadata: {
    id: validateRegistryId("@pixiebrix/test-blueprint"),
    name: "Test Blueprint",
  },
  extensionPoints: [],
  sharing: {
    public: true,
    organizations: [],
  },
  updated_at: "2022-01-01T00:00:00Z" as Timestamp,
  kind: DefinitionKinds.MOD,
  apiVersion: "v3" as ApiVersion,
} as ModDefinition;

const Template: ComponentStory<typeof GetStartedView> = (args) => (
  <Provider
    store={optionsStore({
      auth: {
        milestones: [
          {
            key: "first_time_public_blueprint_install",
            metadata: { blueprintId: testRecipe.metadata.id },
          },
        ],
      },
      recipes: valueToAsyncCacheState([testRecipe]),
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

export const ActivateBlueprint = Template.bind({});
ActivateBlueprint.args = {
  width: 800,
  height: 500,
};

ActivateBlueprint.parameters = {
  msw: {
    handlers: [
      rest.get("/api/marketplace/listings/", async (request, result, context) =>
        result(
          context.json([
            {
              package: {
                name: testRecipe.metadata.id,
                verbose_name: testRecipe.metadata.name,
              },
            },
          ]),
        ),
      ),
    ],
  },
};
