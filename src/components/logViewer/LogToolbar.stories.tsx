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
import { ComponentMeta, ComponentStory } from "@storybook/react";
import LogToolbar from "./LogToolbar";
import { ToastProvider } from "react-toast-notifications";
import { action } from "@storybook/addon-actions";

const promiseAction = (name: string) => {
  const actionFn = action(name);
  return async (...args: unknown[]) => {
    actionFn(...args);
  };
};

const componentMeta: ComponentMeta<typeof LogToolbar> = {
  title: "Editor/LogToolbar",
  component: LogToolbar,
  argTypes: {
    setLevel: {
      action: "setLevel",
    },
    setPage: {
      action: "setPage",
    },
  },
};

const Template: ComponentStory<typeof LogToolbar> = (args) => (
  <ToastProvider>
    <LogToolbar {...args} />
  </ToastProvider>
);

export const Default = Template.bind({});
Default.args = {
  page: 3,
  numPages: 10,
  hasEntries: true,
  numNew: 0,
  clear: promiseAction("close"),
  refresh: promiseAction("refresh"),
};

export default componentMeta;
