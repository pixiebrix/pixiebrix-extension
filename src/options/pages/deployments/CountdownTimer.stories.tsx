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
import { CountdownTimer } from "@/options/pages/deployments/DeploymentModal";
import { action } from "@storybook/addon-actions";

export default {
  title: "Options/CountdownTimer",
  component: CountdownTimer,
} as ComponentMeta<typeof CountdownTimer>;

const Template: ComponentStory<typeof CountdownTimer> = (args) => (
  <CountdownTimer {...args} />
);

export const Running = Template.bind({});
Running.args = {
  start: Date.now() - 5000,
  duration: 60 * 60 * 1000,
  onFinish: action("finish"),
};

export const Completed = Template.bind({});
Completed.args = {
  start: Date.now() - 5000,
  duration: 0,
  onFinish: action("finish"),
};
