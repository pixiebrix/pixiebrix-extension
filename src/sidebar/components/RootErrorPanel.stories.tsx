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

import AsyncButton from "@/components/AsyncButton";
import { BusinessError, NoRendererError } from "@/errors/businessErrors";
import RootErrorPanel from "@/sidebar/components/RootErrorPanel";

export default {
  title: "Panels/RootErrorPanel",
  component: RootErrorPanel,
} as ComponentMeta<typeof AsyncButton>;

const Template: ComponentStory<typeof RootErrorPanel> = (args) => (
  <div style={{ width: 400, height: 500, backgroundColor: "white" }}>
    <RootErrorPanel {...args} />
  </div>
);

export const BusinessErrorExample = Template.bind({});
BusinessErrorExample.args = {
  error: new BusinessError("Something bad happened"),
};

export const ApplicationErrorExample = Template.bind({});
ApplicationErrorExample.args = {
  error: new Error("Something bad happened"),
};

export const NoRendererErrorExample = Template.bind({});
NoRendererErrorExample.args = {
  error: new NoRendererError(),
};
