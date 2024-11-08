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

import CssClassWidget from "@/components/fields/schemaFields/widgets/cssClassWidgets/CssClassWidget";
import React from "react";
import { type Expression } from "@/types/runtimeTypes";
import { render, screen } from "@/pageEditor/testHelpers";
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
    { initialValues: { cssClass: value } },
  );

beforeAll(() => {
  registerDefaultWidgets();
});

describe("CssClassWidget", () => {
  it("should render blank literal", () => {
    const { asFragment } = renderWidget("");
    expect(asFragment()).toMatchSnapshot();
  });

  it("text align buttons", async () => {
    const { getFormState } = renderWidget("extra-class font-weight-bold");

    // Overwrites text-alignment
    await userEvent.click(screen.getByRole("button", { name: "text-left" }));
    expect(getFormState()).toStrictEqual({
      cssClass: "extra-class font-weight-bold text-left",
    });
    await userEvent.click(screen.getByRole("button", { name: "text-center" }));
    expect(getFormState()).toStrictEqual({
      cssClass: "extra-class font-weight-bold text-center",
    });
    await userEvent.click(screen.getByRole("button", { name: "text-right" }));
    expect(getFormState()).toStrictEqual({
      cssClass: "extra-class font-weight-bold text-right",
    });
    await userEvent.click(screen.getByRole("button", { name: "text-justify" }));
    expect(getFormState()).toStrictEqual({
      cssClass: "extra-class font-weight-bold text-justify",
    });
  });

  it("font weight button", async () => {
    const { getFormState } = renderWidget("extra-class text-justify");
    // Overwrites font-weight
    await userEvent.click(
      screen.getByRole("button", { name: "font-weight-bold" }),
    );
    expect(getFormState()).toStrictEqual({
      cssClass: "extra-class text-justify font-weight-bold",
    });
    await userEvent.click(
      screen.getByRole("button", { name: "font-weight-bold" }),
    );
    expect(getFormState()).toStrictEqual({
      cssClass: "extra-class text-justify",
    });
  });

  it("font style button", async () => {
    const { getFormState } = renderWidget("extra-class text-justify");
    // Overwrites font-style
    await userEvent.click(screen.getByRole("button", { name: "font-italic" }));
    expect(getFormState()).toStrictEqual({
      cssClass: "extra-class text-justify font-italic",
    });
    await userEvent.click(screen.getByRole("button", { name: "font-italic" }));
    expect(getFormState()).toStrictEqual({
      cssClass: "extra-class text-justify",
    });
  });
});
