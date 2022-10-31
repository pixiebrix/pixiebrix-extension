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
import { ComponentMeta, Story } from "@storybook/react";
import { configureStore } from "@reduxjs/toolkit";
import extensionsSlice from "@/store/extensionsSlice";
import settingsSlice from "@/store/settingsSlice";
import { authSlice } from "@/auth/authSlice";
import { Provider } from "react-redux";
import servicesSlice from "@/store/servicesSlice";
import { uuidv4 } from "@/types/helpers";
import PartnerSetupCard from "@/options/pages/onboarding/partner/PartnerSetupCard";
import { AuthState } from "@/auth/authTypes";
import { appApi } from "@/services/api";
import { rest } from "msw";
import { RegistryId } from "@/core";

export default {
  title: "Onboarding/Setup/PartnerSetupCard",
  component: PartnerSetupCard,
} as ComponentMeta<typeof PartnerSetupCard>;

const Template: Story<{
  auth: AuthState;
  configuredServiceId: RegistryId | null;
}> = ({ auth }) => {
  const templateStore = configureStore({
    reducer: {
      options: extensionsSlice.reducer,
      settings: settingsSlice.reducer,
      auth: authSlice.reducer,
      services: servicesSlice.reducer,
      [appApi.reducerPath]: appApi.reducer,
    },
    preloadedState: {
      auth,
      options: extensionsSlice.getInitialState(),
      settings: settingsSlice.getInitialState(),
      services: servicesSlice.getInitialState(),
    },
    middleware(getDefaultMiddleware) {
      /* eslint-disable unicorn/prefer-spread -- use .concat for proper type inference */
      return getDefaultMiddleware({
        // See https://github.com/rt2zz/redux-persist/issues/988#issuecomment-654875104
        serializableCheck: {
          ignoredActions: ["persist/PERSIST", "persist/FLUSH"],
        },
      }).concat(appApi.middleware);
      /* eslint-enable unicorn/prefer-spread */
    },
  });

  return (
    <Provider store={templateStore}>
      <PartnerSetupCard />
    </Provider>
  );
};

export const OAuth2 = Template.bind({});
OAuth2.args = {
  auth: { ...authSlice.getInitialState(), isLoggedIn: false },
};
OAuth2.storyName = "OAuth2";
OAuth2.parameters = {
  msw: {
    handlers: [
      rest.get("/api/me/", (request, result, context) =>
        // State is blank for unauthenticated users
        result(context.json({}))
      ),
    ],
  },
};

export const TokenUnlinked = Template.bind({});
TokenUnlinked.args = {
  auth: { ...authSlice.getInitialState(), isLoggedIn: true },
};
TokenUnlinked.storyName = "Token (Unlinked Extension)";
TokenUnlinked.parameters = {
  msw: {
    handlers: [
      rest.get("/api/me/", (request, result, context) =>
        // State is blank for unauthenticated users
        result(context.json({}))
      ),
    ],
  },
};

export const TokenLinked = Template.bind({});
TokenLinked.args = {
  auth: { ...authSlice.getInitialState(), isLoggedIn: true },
};
TokenLinked.storyName = "Token (Linked Extension)";
TokenLinked.parameters = {
  msw: {
    handlers: [
      rest.get("/api/me/", (request, result, context) =>
        result(
          context.json({
            id: uuidv4(),
          })
        )
      ),
    ],
  },
};
