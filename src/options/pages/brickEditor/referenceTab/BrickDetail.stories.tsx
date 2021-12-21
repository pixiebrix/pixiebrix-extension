/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import BrickDetail from "./BrickDetail";
import { TableRenderer } from "@/blocks/renderers/table";
import { ToastProvider } from "react-toast-notifications";
import { fromJS } from "@/blocks/transformers/blockFactory";
import amazonSearch from "@contrib/blocks/amazon-search.yaml";
import { brickToYaml } from "@/utils/objToYaml";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { appApi } from "@/services/api";

export default {
  title: "Components/BrickDetail",
  component: BrickDetail,
} as ComponentMeta<typeof BrickDetail>;

function optionsStore(initialState?: any) {
  return configureStore({
    reducer: {
      [appApi.reducerPath]: appApi.reducer,
    },
    preloadedState: initialState,
  });
}

const Template: ComponentStory<typeof BrickDetail> = (args) => (
  <Provider store={optionsStore()}>
    <ToastProvider>
      <BrickDetail {...args} />
    </ToastProvider>
  </Provider>
);

export const BuiltIn = Template.bind({});
BuiltIn.args = {
  brick: new TableRenderer(),
  brickConfig: null,
  isBrickConfigLoading: false,
};

const amazonSearchBrick = fromJS(amazonSearch);
const amazonSearchBrickConfig = brickToYaml(amazonSearch);
export const AmazonSearch = Template.bind({});
AmazonSearch.args = {
  brick: amazonSearchBrick,
  brickConfig: amazonSearchBrickConfig,
  isBrickConfigLoading: false,
};
