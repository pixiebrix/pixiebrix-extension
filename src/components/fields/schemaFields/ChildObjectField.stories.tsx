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
import { Form, Formik } from "formik";
import { SchemaFieldProps } from "@/components/fields/schemaFields/propTypes";
import { Button } from "react-bootstrap";
import { getFieldNamesFromPathString } from "@/runtime/pathHelpers";
import { action } from "@storybook/addon-actions";
import ChildObjectField from "@/components/fields/schemaFields/ChildObjectField";

export default {
  title: "Fields/ChildObjectField",
  component: ChildObjectField,
} as ComponentMeta<typeof ChildObjectField>;

const Template: ComponentStory<
  React.FunctionComponent<
    SchemaFieldProps & {
      defaultValue: unknown;
      required?: boolean;
    }
  >
> = (args) => {
  return (
    <Formik
      initialValues={{
        apiVersion: "v3",
        childObject: {},
      }}
      onSubmit={action("onSubmit")}
    >
      <Form>
        <ChildObjectField {...args} heading="Child Object" />
        <Button type="submit">Submit</Button>
      </Form>
    </Formik>
  );
};

export const PrimitiveValue = Template.bind({});
PrimitiveValue.args = {
  name: "childObject",
  schema: {
    type: "object",
    properties: {
      InputValue: {
        type: "string",
        description: "This is a description for the field",
      },
    },
  },
};
