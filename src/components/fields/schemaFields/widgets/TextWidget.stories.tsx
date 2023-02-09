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
import TextWidget from "@/components/fields/schemaFields/widgets/TextWidget";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import { type Expression, type Schema  } from "@/core";
import { settingsStore } from "@/testUtils/storyUtils";
import { Provider } from "react-redux";

export default {
  title: "Widgets/TextWidget",
  component: TextWidget,
} as ComponentMeta<typeof TextWidget>;

const schema: Schema = {
  type: "string",
  description: "this is a test field description"
};
const fieldName = "text";

const Template: Story<
  typeof TextWidget & { initialValues: { text: string | Expression } }
> = ({ initialValues }) => (
  <Provider store={settingsStore()}>
    <Formik initialValues={initialValues} onSubmit={action("submit")}>
      <>
        <div>
          <TextWidget
            schema={schema}
            name={fieldName}
          />
        </div>
      </>
    </Formik>
  </Provider>
);

export const BlankLiteral = Template.bind({});
BlankLiteral.args = {
  initialValues: {
    text: "",
  },
};

export const Omitted = Template.bind({});
Omitted.args = {
  initialValues: {
    text: null,
  },
};

export const BlankExpression = Template.bind({});
BlankExpression.args = {
  initialValues: {
    text: {
      __type__: "nunjucks",
      __value__: "",
    },
  },
};

export const TemplateExpression = Template.bind({});
TemplateExpression.args = {
  initialValues: {
    text: {
      __type__: "nunjucks",
      __value__: "Hello, {{ @person.firstName }}!",
    },
  },
};

export const ConditionalExpression = Template.bind({});
ConditionalExpression.args = {
  initialValues: {
    text: {
      __type__: "nunjucks",
      __value__: '{% if @animal == "cat" %}\n  Meow!\n{% elif @animal == "dog" %}\n  Woof!\n{% else %}\n  Moo!\n{% endif %}',
    },
  },
};

export const FilterExpression = Template.bind({});
FilterExpression.args = {
  initialValues: {
    text: {
      __type__: "nunjucks",
      __value__: '{{ @userPreference.data["favorite color"] | truncate(15) | title }}',
    },
  },
};


