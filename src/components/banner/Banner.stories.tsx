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

import Banner from "./Banner";
import { Button } from "react-bootstrap";

export default {
  title: "Components/Banner",
  component: Banner,
  argTypes: {
    variant: {
      options: ["success", "info", "warning", "danger"],
      control: {
        type: "select",
      },
    },
  },
} as ComponentMeta<typeof Banner>;

const Template: ComponentStory<typeof Banner> = (args) => <Banner {...args} />;

export const Info = Template.bind({});
Info.args = {
  variant: "info",
  children: (
    <span>
      This is an info banner. <strong>Check it out!</strong>{" "}
      <a href="#">Link</a>
    </span>
  ),
};

export const Success = Template.bind({});
Success.args = {
  variant: "success",
  children: (
    <span>
      This is a success banner. <strong>Something good happened!</strong>{" "}
      <a href="#">Link</a>
    </span>
  ),
};

export const Danger = Template.bind({});
Danger.args = {
  variant: "danger",
  children: (
    <span>
      This is a danger banner. <strong>Something went wrong!</strong>{" "}
      <a href="#">Link</a>
    </span>
  ),
};

export const Warning = Template.bind({});
Warning.args = {
  variant: "warning",
  children: (
    <span>
      This is a warning banner. <strong>Something is not quite right.</strong>{" "}
      <a href="#">Link</a>
    </span>
  ),
};

export const WithButton = Template.bind({});
WithButton.args = {
  children: (
    <>
      You have a button to click on! A small button looks best.{" "}
      <Button size="sm">Click me!</Button>
    </>
  ),
};
