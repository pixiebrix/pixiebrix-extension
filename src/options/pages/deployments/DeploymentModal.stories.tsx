/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import React, { type ComponentProps } from "react";
import { type ComponentMeta, type Story } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import DeploymentModal from "@/options/pages/deployments/DeploymentModal";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import extensionsSlice from "@/store/extensionsSlice";
import settingsSlice from "@/store/settingsSlice";
import { authSlice } from "@/auth/authSlice";
import { appApi } from "@/services/api";

export default {
  title: "Options/DeploymentModal",
  component: DeploymentModal,
  // Modals are not compatible with Storyshots
  parameters: {
    storyshots: false,
  },
} as ComponentMeta<typeof DeploymentModal>;

type StoryType = ComponentProps<typeof DeploymentModal> & {
  updateAvailable?: boolean;
  enforceUpdateMillis?: number | null;
  updatePromptTimestamp?: number | null;
};

const Template: Story<StoryType> = ({
  extensionUpdateRequired,
  enforceUpdateMillis,
  updatePromptTimestamp,
}) => {
  const extensionsStore = configureStore({
    reducer: {
      options: extensionsSlice.reducer,
      settings: settingsSlice.reducer,
      auth: authSlice.reducer,
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware(getDefaultMiddleware) {
      /* eslint-disable unicorn/prefer-spread -- It's not Array#concat, can't use spread */
      return getDefaultMiddleware().concat(appApi.middleware);
      /* eslint-enable unicorn/prefer-spread */
    },
    preloadedState: {
      options: extensionsSlice.getInitialState(),
      settings: { ...settingsSlice.getInitialState(), updatePromptTimestamp },
      auth: { ...authSlice.getInitialState(), enforceUpdateMillis },
    },
  });

  return (
    <Provider store={extensionsStore}>
      <DeploymentModal
        extensionUpdateRequired={extensionUpdateRequired}
        update={async () => {
          action("update");
        }}
        updateExtension={async () => {
          action("updateExtension");
        }}
      />
    </Provider>
  );
};

export const ExtensionUpdateRequired = Template.bind({});
ExtensionUpdateRequired.args = {
  extensionUpdateRequired: true,
};

export const DeploymentUpdate = Template.bind({});
DeploymentUpdate.args = {
  extensionUpdateRequired: false,
};
