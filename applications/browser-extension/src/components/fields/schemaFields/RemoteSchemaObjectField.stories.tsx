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
import { type ComponentMeta, type ComponentStory } from "@storybook/react";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Form, Formik } from "formik";
import { Button } from "react-bootstrap";
import { action } from "@storybook/addon-actions";
import RemoteSchemaObjectField, {
  type RemoteSchemaObjectFieldProps,
} from "./RemoteSchemaObjectField";
import { settingsStore } from "../../../testUtils/storyUtils";
import { Provider } from "react-redux";
import { valueToAsyncState } from "../../../utils/asyncStateUtils";
import { type Schema } from "../../../types/schemaTypes";

export default {
  title: "Fields/RemoteSchemaObjectField",
  component: RemoteSchemaObjectField,
} as ComponentMeta<typeof RemoteSchemaObjectField>;

const Template: ComponentStory<React.FC<RemoteSchemaObjectFieldProps>> = (
  args,
) => (
  <Provider store={settingsStore()}>
    <Formik
      initialValues={{
        apiVersion: "v3",
        childObject: {},
      }}
      onSubmit={action("onSubmit")}
    >
      <Form>
        <RemoteSchemaObjectField {...args} />
        <Button type="submit">Submit</Button>
      </Form>
    </Formik>
  </Provider>
);

export const PrimitiveValue = Template.bind({});
PrimitiveValue.args = {
  name: "childObject",
  heading: "Child Object",
  remoteSchemaState: valueToAsyncState<Schema>({
    type: "object",
    properties: {
      InputValue: {
        type: "string",
        description: "This is a description for the field",
      },
    },
  }),
};
