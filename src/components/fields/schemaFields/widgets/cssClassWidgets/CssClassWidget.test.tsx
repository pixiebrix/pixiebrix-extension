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
import React from "react";
import { type Expression } from "@/types/runtimeTypes";
import { render } from "@/pageEditor/testHelpers";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { getCssClassInputFieldOptions } from "@/components/fields/schemaFields/CssClassField";
import userEvent from "@testing-library/user-event";

const renderWidget = (value: string | Expression) =>
  render(
    <CssClassWidget
      inputModeOptions={getCssClassInputFieldOptions()}
      schema={{
        type: "string",
      }}
      name="cssClass"
    />,
    { initialValues: { cssClass: value } }
  );

beforeAll(() => {
  registerDefaultWidgets();
});

describe("CssClassWidget", () => {
  it("should render blank literal", () => {
    const result = renderWidget("");
    expect(result.asFragment()).toMatchSnapshot();
  });

  it("toggles flags in the same category without affecting extra classes", async () => {
    const { getByTestId, getFormState } = renderWidget("extra-class");

    // Overwrites text-alignment
    await userEvent.click(getByTestId("text-left-button"));
    expect(getFormState()).toStrictEqual({ cssClass: "extra-class text-left" });
    await userEvent.click(getByTestId("text-center-button"));
    expect(getFormState()).toStrictEqual({
      cssClass: "extra-class text-center",
    });
    await userEvent.click(getByTestId("text-right-button"));
    expect(getFormState()).toStrictEqual({
      cssClass: "extra-class text-right",
    });
    await userEvent.click(getByTestId("text-justify-button"));
    expect(getFormState()).toStrictEqual({
      cssClass: "extra-class text-justify",
    });

    // Overwrites font-weight
    await userEvent.click(getByTestId("font-weight-bold-button"));
    expect(getFormState()).toStrictEqual({
      cssClass: "extra-class text-justify font-weight-bold",
    });
    await userEvent.click(getByTestId("font-weight-bold-button"));
    expect(getFormState()).toStrictEqual({
      cssClass: "extra-class text-justify",
    });

    // Overwrites font-style
    await userEvent.click(getByTestId("font-italic-button"));
    expect(getFormState()).toStrictEqual({
      cssClass: "extra-class text-justify font-italic",
    });
    await userEvent.click(getByTestId("font-italic-button"));
    expect(getFormState()).toStrictEqual({
      cssClass: "extra-class text-justify",
    });
  });
});
