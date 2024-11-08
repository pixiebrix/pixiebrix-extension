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
import { type Expression } from "../../../../../types/runtimeTypes";
import { render, screen } from "../../../../../pageEditor/testHelpers";
import registerDefaultWidgets from "../registerDefaultWidgets";
import CssSpacingWidget from "./CssSpacingWidget";
import selectEvent from "react-select-event";
import userEvent from "@testing-library/user-event";
import { getCssClassInputFieldOptions } from "../../CssClassField";

const renderWidget = (value: string | Expression) =>
  render(
    <CssSpacingWidget
      inputModeOptions={getCssClassInputFieldOptions()}
      schema={{
        type: "string",
      }}
      label="spacing"
      name="cssClass"
    />,
    { initialValues: { cssClass: value } },
  );

beforeAll(() => {
  registerDefaultWidgets();
});

describe("CssClassWidget", () => {
  it("should render the spacing widget", () => {
    expect(renderWidget).toMatchSnapshot();
  });

  it("expand button works", async () => {
    renderWidget("");

    expect(
      screen.queryByRole("combobox", { name: "Top" }),
    ).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Margin" }));
    expect(screen.getByRole("combobox", { name: "Top" })).toBeInTheDocument();
  });

  it("clears the direction inputs when the main input is set", async () => {
    const { getFormState } = renderWidget("test mr-1 mb-1");
    await selectEvent.select(
      screen.getByRole("combobox", { name: "Margin" }),
      "1",
    );

    expect(getFormState()).toStrictEqual({ cssClass: "test m-1" });
  });

  it("clears the main input when the direction input is set", async () => {
    const { getFormState } = renderWidget("test m-1");

    await userEvent.click(screen.getByRole("button", { name: "Margin" }));

    await selectEvent.select(
      screen.getByRole("combobox", { name: "Top" }),
      "3",
    );

    expect(getFormState()).toStrictEqual({ cssClass: "test mt-3" });
  });
});
