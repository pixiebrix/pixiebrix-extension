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

import React, { useEffect } from "react";
import { type ComponentMeta, type Story } from "@storybook/react";
import { configureStore } from "@reduxjs/toolkit";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import settingsSlice from "@/store/settings/settingsSlice";
import { authSlice } from "@/auth/authSlice";
import { Provider } from "react-redux";
import integrationsSlice from "@/integrations/store/integrationsSlice";
import { uuidv4 } from "@/types/helpers";
import PartnerSetupCard from "@/extensionConsole/pages/onboarding/partner/PartnerSetupCard";
import { type AuthState } from "@/auth/authTypes";
import { appApi } from "@/data/service/api";
import { rest } from "msw";
import { HashRouter } from "react-router-dom";
import { createHashHistory } from "history";
import { addThemeClassToDocumentRoot } from "@/themes/themeUtils";
import defaultMiddlewareConfig from "@/store/defaultMiddlewareConfig";
import { meApiResponseFactory } from "@/testUtils/factories/authFactories";
import { mockAnonymousMeApiResponse } from "@/testUtils/userMock";
import { API_PATHS } from "@/data/service/urlPaths";

export default {
  title: "Onboarding/Setup/PartnerSetupCard",
  component: PartnerSetupCard,
} as ComponentMeta<typeof PartnerSetupCard>;

const PartnerThemeEffect: React.FunctionComponent = () => {
  useEffect(() => {
    addThemeClassToDocumentRoot("automation-anywhere");

    return () => {
      addThemeClassToDocumentRoot("default");
    };
  }, []);

  return null;
};

const Template: Story<{
  auth: AuthState;
}> = ({ auth }) => {
  mockAnonymousMeApiResponse();

  // Store that doesn't persist the data
  const templateStore = configureStore({
    reducer: {
      options: modComponentSlice.reducer,
      settings: settingsSlice.reducer,
      auth: authSlice.reducer,
      integrations: integrationsSlice.reducer,
      [appApi.reducerPath]: appApi.reducer,
    },
    preloadedState: {
      auth,
      options: modComponentSlice.getInitialState(),
      settings: settingsSlice.getInitialState(),
      integrations: integrationsSlice.getInitialState(),
    },
    middleware(getDefaultMiddleware) {
      return getDefaultMiddleware(defaultMiddlewareConfig).concat(
        appApi.middleware,
      );
    },
  });

  const history = createHashHistory();
  history.push("/");

  return (
    <Provider store={templateStore}>
      <PartnerThemeEffect />
      <HashRouter>
        <PartnerSetupCard />
      </HashRouter>
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
      rest.get(API_PATHS.FEATURE_FLAGS, async (request, result, context) =>
        // State is blank for unauthenticated users
        result(context.json({ flags: [] })),
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
      rest.get(API_PATHS.FEATURE_FLAGS, async (request, result, context) =>
        // State is blank for unauthenticated users
        result(context.json({ flags: [] })),
      ),
    ],
  },
};

export const TokenLinked = Template.bind({});
TokenLinked.args = {
  auth: { ...authSlice.getInitialState(), isLoggedIn: true, userId: uuidv4() },
};
TokenLinked.storyName = "Token (Linked Extension)";
TokenLinked.parameters = {
  msw: {
    handlers: [
      rest.get(API_PATHS.ME, async (request, result, context) =>
        result(context.json(meApiResponseFactory())),
      ),
    ],
  },
};
