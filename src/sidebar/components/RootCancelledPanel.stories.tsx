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

import AsyncButton from "@/components/AsyncButton";
import RootCancelledPanel from "@/sidebar/components/RootCancelledPanel";
import { CancelError } from "@/errors/businessErrors";

export default {
  title: "Panels/RootCancelledPanel",
  component: RootCancelledPanel,
} as ComponentMeta<typeof AsyncButton>;

const Template: ComponentStory<typeof RootCancelledPanel> = (args) => (
  <div style={{ width: 400, height: 500, backgroundColor: "white" }}>
    <RootCancelledPanel {...args} />
  </div>
);

export const Default = Template.bind({});
Default.args = {
  error: new CancelError("Action cancelled"),
};
