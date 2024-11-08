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
import { type Meta, type StoryObj } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import TextWidget from "./TextWidget";
import { settingsStore } from "../../../../testUtils/storyUtils";
import { Provider } from "react-redux";
import Form from "../../../form/Form";
import { type Expression } from "../../../../types/runtimeTypes";
import { toExpression } from "../../../../utils/expressionUtils";

type TextWidgetPropsAndCustomArgs = React.ComponentProps<typeof TextWidget> & {
  exampleValue: string | Expression;
};

const meta: Meta<TextWidgetPropsAndCustomArgs> = {
  title: "Widgets/TextWidget",
  component: TextWidget,

  render: ({ exampleValue }) => (
    <Provider store={settingsStore()}>
      <Form
        initialValues={{
          apiVersion: "v3",
          example: exampleValue,
        }}
        onSubmit={action("onSubmit")}
        renderSubmit={() => null}
      >
        <TextWidget
          name="example"
          onChange={action("onChange")}
          schema={{
            type: "string",
          }}
        />
      </Form>
    </Provider>
  ),
};

export default meta;

type Story = StoryObj<TextWidgetPropsAndCustomArgs>;

export const Empty: Story = {};

export const RawText: Story = {
  args: { exampleValue: "The quick brown fox jumps over the lazy dog" },
};

export const SingleLine: Story = {
  args: {
    exampleValue: toExpression(
      "nunjucks",
      "The quick brown fox jumps over the lazy dog",
    ),
  },
};

export const LongLine: Story = {
  args: {
    exampleValue: toExpression(
      "nunjucks",
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec congue, magna vel viverra rutrum, mi nisi venenatis arcu, at tincidunt orci sapien a ante. Donec ac massa a urna dictum mollis. Ut feugiat accumsan ipsum eget vehicula. Sed ultricies, lorem sit amet aliquam lobortis, sem erat dictum elit, laoreet rhoncus nulla felis id purus. Etiam consequat tincidunt ipsum vitae pulvinar. Nam at turpis elementum, dignissim nulla ut, eleifend est. Nullam rutrum justo quis sapien semper pretium.",
    ),
  },
};

export const NunjucksExpression: Story = {
  args: {
    exampleValue: toExpression("nunjucks", "Hello, {{ @input.name }}!"),
  },
};

export const NunjucksTags: Story = {
  args: {
    exampleValue: toExpression(
      "nunjucks",
      'My favorite color is {% if @input.day == "Monday" %}red{% else %}blue{% endif %}',
    ),
  },
};
