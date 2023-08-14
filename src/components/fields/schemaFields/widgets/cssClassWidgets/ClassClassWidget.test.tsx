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

import CssClassWidget from "@/components/fields/schemaFields/widgets/cssClassWidgets/CssClassWidget";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import React from "react";
import { type Expression } from "@/types/runtimeTypes";
import { noop } from "lodash";
import { render } from "@/pageEditor/testHelpers";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { getCssClassInputFieldOptions } from "@/components/fields/schemaFields/CssClassField";

const renderWidget = (value: string | Expression) =>
  render(
    <Formik initialValues={{ cssClass: value }} onSubmit={noop}>
      <CssClassWidget
        inputModeOptions={getCssClassInputFieldOptions()}
        schema={{
          type: "string",
        }}
        name="cssClass"
      />
    </Formik>
  );

beforeAll(() => {
  registerDefaultWidgets();
});

describe("CssClassWidget", () => {
  it("should render blank literal", () => {
    const result = renderWidget("");
    expect(result.asFragment()).toMatchSnapshot();
  });
});
