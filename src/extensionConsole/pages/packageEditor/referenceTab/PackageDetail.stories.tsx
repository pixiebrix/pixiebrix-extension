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
import PackageDetail from "./PackageDetail";
import { TableRenderer } from "@/bricks/renderers/table";
import { fromJS as nativeFromJS } from "@/bricks/transformers/brickFactory";
import amazonSearch from "@contrib/bricks/amazon-search.yaml";
import { brickToYaml } from "@/utils/objToYaml";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { appApi } from "@/data/service/api";
import brickRegistry from "@/bricks/registry";
import { partial } from "lodash";

export default {
  title: "Components/PackageDetail",
  component: PackageDetail,
} as ComponentMeta<typeof PackageDetail>;

const fromJS = partial(nativeFromJS, brickRegistry);

function optionsStore() {
  return configureStore({
    reducer: {
      [appApi.reducerPath]: appApi.reducer,
    },
    middleware(getDefaultMiddleware) {
      return getDefaultMiddleware().concat(appApi.middleware);
    },
  });
}

const Template: ComponentStory<typeof PackageDetail> = (args) => (
  <Provider store={optionsStore()}>
    <PackageDetail {...args} />
  </Provider>
);

export const BuiltIn = Template.bind({});
BuiltIn.args = {
  packageInstance: new TableRenderer(),
  packageConfig: null,
  isPackageConfigLoading: false,
};

const amazonSearchBrick = fromJS(amazonSearch);
const amazonSearchBrickConfig = brickToYaml(amazonSearch);
export const AmazonSearch = Template.bind({});
AmazonSearch.args = {
  packageInstance: amazonSearchBrick,
  packageConfig: amazonSearchBrickConfig,
  isPackageConfigLoading: false,
};
