/*
 * Copyright (C) 2023 PixieBrix, Inc.
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
import { type ComponentMeta, type Story } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import TemplateTextWidget from "@/components/fields/schemaFields/widgets/TemplateTextWidget";
import { settingsStore } from "@/testUtils/storyUtils";
import { Provider } from "react-redux";
import Form from "@/components/form/Form";
import { makeTemplateExpression } from "@/runtime/expressionCreators";
import { type Expression } from "@/core";

export default {
  title: "Widgets/TemplateTextWidget",
  component: TemplateTextWidget,
  args: {},
} as ComponentMeta<typeof TemplateTextWidget>;

const Template: Story<{ value: string | Expression }> = ({ value }) => (
  <Provider store={settingsStore()}>
    <Form
      initialValues={{
        apiVersion: "v3",
        example: value,
      }}
      onSubmit={action("onSubmit")}
      renderSubmit={() => null}
    >
      <TemplateTextWidget
        name="example"
        onChange={action("onChange")}
        schema={{
          type: "string",
        }}
      />
    </Form>
  </Provider>
);

export const Empty = Template.bind({});
Empty.args = {};

export const RawText = Template.bind({});
RawText.args = {
  value: "The quick brown fox jumps over the lazy dog",
};

export const SingleLine = Template.bind({});
SingleLine.args = {
  value: makeTemplateExpression(
    "nunjucks",
    "The quick brown fox jumps over the lazy dog"
  ),
};

export const LongLine = Template.bind({});
LongLine.args = {
  value: makeTemplateExpression(
    "nunjucks",
    "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec congue, magna vel viverra rutrum, mi nisi venenatis arcu, at tincidunt orci sapien a ante. Donec ac massa a urna dictum mollis. Ut feugiat accumsan ipsum eget vehicula. Sed ultricies, lorem sit amet aliquam lobortis, sem erat dictum elit, laoreet rhoncus nulla felis id purus. Etiam consequat tincidunt ipsum vitae pulvinar. Nam at turpis elementum, dignissim nulla ut, eleifend est. Nullam rutrum justo quis sapien semper pretium."
  ),
};

export const NunjucksExpression = Template.bind({});
NunjucksExpression.args = {
  value: makeTemplateExpression("nunjucks", "Hello, {{ @input.name }}!"),
};

export const NunjucksTags = Template.bind({});
NunjucksTags.args = {
  value: makeTemplateExpression(
    "nunjucks",
    'My favorite color is {% if @input.day == "Monday" %}red{% else %}blue{% endif %}'
  ),
};


export const LongNunjucks = Template.bind({});
LongNunjucks.args = {
  value: makeTemplateExpression(
    "nunjucks",
    "Hello, {{ @input.firstName }}, your name is {{ @input.firstName | length }} letters long. {% if @input.sayGoodbye %} Goodbye! {% endif %}"
  ),
};
