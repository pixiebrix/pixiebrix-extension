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
import PartnerOAuthSetupCard from "./PartnerOAuthSetupCard";
import { configureStore } from "@reduxjs/toolkit";
import extensionsSlice from "@/store/extensionsSlice";
import settingsSlice from "@/store/settingsSlice";
import { authSlice } from "@/auth/authSlice";
import { Provider } from "react-redux";
import servicesSlice from "@/store/servicesSlice";
import { uuidv4 } from "@/types/helpers";
import { CONTROL_ROOM_OAUTH_SERVICE_ID } from "@/services/constants";
import { RawServiceConfiguration } from "@/core";

export default {
  title: "Onboarding/Setup/PartnerOAuthSetupCard",
  component: PartnerOAuthSetupCard,
} as ComponentMeta<typeof PartnerOAuthSetupCard>;

const Template: ComponentStory<typeof PartnerOAuthSetupCard> = (args) => {
  const configId = uuidv4();

  const extensionsStore = configureStore({
    reducer: {
      options: extensionsSlice.reducer,
      settings: settingsSlice.reducer,
      auth: authSlice.reducer,
      services: servicesSlice.reducer,
    },
    preloadedState: {
      options: extensionsSlice.getInitialState(),
      settings: {
        ...settingsSlice.getInitialState(),
        authServiceId: CONTROL_ROOM_OAUTH_SERVICE_ID,
      },
      auth: authSlice.getInitialState(),
      services: {
        ...servicesSlice.getInitialState(),
        configured: {
          [configId]: {
            id: configId,
            serviceId: CONTROL_ROOM_OAUTH_SERVICE_ID,
          } as RawServiceConfiguration,
        },
      },
    },
  });

  return (
    <Provider store={extensionsStore}>
      <PartnerOAuthSetupCard {...args} />
    </Provider>
  );
};

export const Default = Template.bind({});
