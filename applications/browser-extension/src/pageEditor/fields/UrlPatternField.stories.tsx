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
import Form from "../../components/form/Form";
import { action } from "@storybook/addon-actions";
import registerDefaultWidgets from "../../components/fields/schemaFields/widgets/registerDefaultWidgets";
import UrlPatternField, {
  type UrlPatternFieldProps,
} from "./UrlPatternField";
import { editorStore } from "../../testUtils/storyUtils";
import { Provider } from "react-redux";

registerDefaultWidgets();

export default {
  title: "Fields/UrlPatternField",
  component: UrlPatternField,
} as ComponentMeta<typeof UrlPatternField>;

const defaultProps: UrlPatternFieldProps = {
  name: "urlsPatterns",
  label: "URL Patterns",
};

const Template: ComponentStory<
  React.VoidFunctionComponent<UrlPatternFieldProps>
> = (props) => (
  <Provider store={editorStore()}>
    <Form
      initialValues={{
        apiVersion: "v3",
        matchPatterns: [],
      }}
      validationSchema={undefined}
      onSubmit={(values, { setSubmitting }) => {
        action("onSubmit")(values);
        setSubmitting(false);
      }}
    >
      <UrlPatternField {...props} />
    </Form>
  </Provider>
);

export const Default = Template.bind({});
Default.args = defaultProps;
