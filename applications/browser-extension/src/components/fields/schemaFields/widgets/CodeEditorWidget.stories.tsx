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
import { settingsStore } from "../../../../testUtils/storyUtils";
import { Provider } from "react-redux";
import Form from "../../../form/Form";
import CodeEditorWidget from "./CodeEditorWidget";
import { type JSONSchema7 } from "json-schema";

type CodeEditorWidgetPropsAndCustomArgs = React.ComponentProps<
  typeof CodeEditorWidget
> & {
  exampleValue: string;
};

const schema: JSONSchema7 = {
  title: "Function",
  type: "string",
  description: "The Javascript function",
};

const meta: Meta<CodeEditorWidgetPropsAndCustomArgs> = {
  title: "Widgets/CodeEditorWidget",
  component: CodeEditorWidget,

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
        <CodeEditorWidget name="example" schema={schema} />
      </Form>
    </Provider>
  ),
};

export default meta;

type Story = StoryObj<CodeEditorWidgetPropsAndCustomArgs>;

export const DefaultFunction: Story = {
  args: {
    exampleValue: `function (args) {
  const { x } = args;
  return x;
}`,
  },
};
