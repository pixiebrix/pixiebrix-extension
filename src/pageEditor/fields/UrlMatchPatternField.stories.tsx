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
import Form from "@/components/form/Form";
import UrlMatchPatternField, {
  UrlMatchPatternFieldProps,
} from "./UrlMatchPatternField";
import { action } from "@storybook/addon-actions";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";

registerDefaultWidgets();

export default {
  title: "Fields/UrlMatchPatternField",
  component: UrlMatchPatternField,
} as ComponentMeta<typeof UrlMatchPatternField>;

const defaultProps: UrlMatchPatternFieldProps = {
  name: "matchPatterns",
  label: "Sites",
};

const Template: ComponentStory<
  React.VoidFunctionComponent<UrlMatchPatternFieldProps>
> = (props) => (
  <Form
    initialValues={{
      apiVersion: "v3",
      matchPatterns: [],
    }}
    validationSchema={null}
    onSubmit={(values, { setSubmitting }) => {
      action("onSubmit")(values);
      setSubmitting(false);
    }}
  >
    <UrlMatchPatternField {...props} />
  </Form>
);

export const Default = Template.bind({});
Default.args = defaultProps;
