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
import { ComponentMeta, ComponentStory } from "@storybook/react";
import { ToastProvider } from "react-toast-notifications";
import JsonTree from "./JsonTree";

export default {
  title: "Components/JsonTree",
  component: JsonTree,
} as ComponentMeta<typeof JsonTree>;

const Template: ComponentStory<typeof JsonTree> = (args) => (
  <ToastProvider>
    <JsonTree {...args} />
  </ToastProvider>
);

const exampleValues = {
  "@input": {
    foo: 42,
    bar: [] as unknown[],
    baz: {
      quoz: "Hello world",
    },
  },
  numberField: 42,
};

export const EmptyTree = Template.bind({});
EmptyTree.args = {
  data: {},
};

export const SearchableTree = Template.bind({});
SearchableTree.args = {
  searchable: true,
  data: exampleValues,
};

export const KitchenSink = Template.bind({});
KitchenSink.args = {
  searchable: true,
  copyable: true,
  label: "Kitchen Sink",
  data: exampleValues,
};
