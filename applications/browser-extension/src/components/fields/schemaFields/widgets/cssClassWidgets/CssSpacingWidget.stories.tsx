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

import { type Meta, type StoryObj } from "@storybook/react";
import CssSpacingWidget from "./CssSpacingWidget";
import type CssClassWidget from "./CssClassWidget";
import { Provider } from "react-redux";
import { settingsStore } from "../../../../../testUtils/storyUtils";
// eslint-disable-next-line no-restricted-imports -- Required for story
import { Formik, useField } from "formik";
import { action } from "@storybook/addon-actions";
import { getCssClassInputFieldOptions } from "../../CssClassField";
import React from "react";
import { parseValue } from "./utils";
import { type Expression } from "../../../../../types/runtimeTypes";

const Preview: React.VFC = () => {
  const [{ value }] = useField("cssClass");

  const { classes, isVar, includesTemplate } = parseValue(value);

  if (isVar || includesTemplate) {
    return <div>Preview not supported</div>;
  }

  return <div>Classes preview: {classes.join(" ")}</div>;
};

type CssClassWidgetPropsAndCustomArgs = React.ComponentProps<
  typeof CssClassWidget
> & {
  initialValues: { cssClass: string | Expression };
};

const meta: Meta<CssClassWidgetPropsAndCustomArgs> = {
  title: "Widgets/CssSpacingWidget",
  component: CssSpacingWidget,
  render: ({ initialValues }) => (
    <Provider store={settingsStore()}>
      <Formik initialValues={initialValues} onSubmit={action("submit")}>
        <>
          <div className="mb-4">
            <Preview />
          </div>
          <div>
            <CssSpacingWidget
              inputModeOptions={getCssClassInputFieldOptions()}
              schema={{
                type: "string",
              }}
              name="cssClass"
            />
          </div>
        </>
      </Formik>
    </Provider>
  ),
};

export default meta;

type Story = StoryObj<CssClassWidgetPropsAndCustomArgs>;

export const BlankLiteral: Story = {
  args: {
    initialValues: {
      cssClass: "",
    },
  },
};
