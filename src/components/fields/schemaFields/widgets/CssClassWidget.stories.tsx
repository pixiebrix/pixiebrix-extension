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
import { ComponentMeta, Story } from "@storybook/react";
import { action } from "@storybook/addon-actions";
import CssClassWidget, { parseValue } from "./CssClassWidget";
import { Formik, useField } from "formik";
import { Expression } from "@/core";
import { getCssClassInputFieldOptions } from "@/components/fields/schemaFields/CssClassField";

export default {
  title: "Widgets/CssClassWidget",
  component: CssClassWidget,
} as ComponentMeta<typeof CssClassWidget>;

const Preview: React.VFC = () => {
  const [{ value }] = useField("cssClass");

  const { classes, isVar, includesTemplate } = parseValue(value);

  if (isVar || includesTemplate) {
    return <div>Preview not supported</div>;
  }

  return (
    <div className={classes.join(" ")}>
      The quick brown fox jumps over the lazy dog
    </div>
  );
};

const Template: Story<
  typeof CssClassWidget & { initialValues: { cssClass: string | Expression } }
> = ({ initialValues }) => {
  return (
    <Formik initialValues={initialValues} onSubmit={action("submit")}>
      <>
        <div className="mb-4">
          <Preview />
        </div>

        <div>
          <CssClassWidget
            inputModeOptions={getCssClassInputFieldOptions()}
            schema={{
              type: "string",
            }}
            name="cssClass"
          />
        </div>
      </>
    </Formik>
  );
};

export const BlankLiteral = Template.bind({});
BlankLiteral.args = {
  initialValues: {
    cssClass: "",
  },
};

export const Omitted = Template.bind({});
Omitted.args = {
  initialValues: {
    cssClass: null,
  },
};

export const BlankExpression = Template.bind({});
BlankExpression.args = {
  initialValues: {
    cssClass: {
      __type__: "nunjucks",
      __value__: "",
    },
  },
};

export const VariableExpression = Template.bind({});
VariableExpression.args = {
  initialValues: {
    cssClass: {
      __type__: "var",
      __value__: "@cssClasses",
    },
  },
};
