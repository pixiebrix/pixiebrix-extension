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
import PartnerSetupCard from "@/options/pages/onboarding/PartnerSetupCard";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { appApi } from "@/services/api";
import useTheme from "@/hooks/useTheme";

export default {
  title: "Onboarding/Setup/PartnerSetupCard",
  component: PartnerSetupCard,
} as ComponentMeta<typeof PartnerSetupCard>;

function optionsStore(initialState?: any) {
  return configureStore({
    reducer: {
      [appApi.reducerPath]: appApi.reducer,
    },
    preloadedState: initialState,
  });
}

const Template: ComponentStory<typeof PartnerSetupCard> = (args) => {
  useTheme("automation-anywhere");

  return (
    <Provider store={optionsStore()}>
      <PartnerSetupCard {...args} />
    </Provider>
  );
};

export const Default = Template.bind({});
