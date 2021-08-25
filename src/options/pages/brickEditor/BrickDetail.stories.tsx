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
import { BrickDetail } from "./BrickDetail";
import { TableRenderer } from "@/blocks/renderers/table";
import { ToastProvider } from "react-toast-notifications";
import { fromJS } from "@/blocks/transformers/blockFactory";
import amazonSearch from "@contrib/blocks/amazon-search.yaml";
import blockRegistry from "@/blocks/registry";
import { add } from "@/registry/localRegistry";

export default {
  title: "Components/BrickDetail",
  component: BrickDetail,
} as ComponentMeta<typeof BrickDetail>;

const Template: ComponentStory<typeof BrickDetail> = (args) => (
  <ToastProvider>
    <BrickDetail {...args} />
  </ToastProvider>
);

export const BuiltIn = Template.bind({});
BuiltIn.args = {
  brick: new TableRenderer(),
};

const amazonSearchBrick = fromJS(amazonSearch);
blockRegistry.register(amazonSearchBrick);
const brickPackage = {
  id: amazonSearchBrick.id,
  version: amazonSearchBrick.version,
  kind: "component",
  config: amazonSearchBrick,
  rawConfig: undefined,
} as any;
void add(brickPackage);

export const AmazonSearch = Template.bind({});
AmazonSearch.args = {
  brick: amazonSearchBrick,
};
