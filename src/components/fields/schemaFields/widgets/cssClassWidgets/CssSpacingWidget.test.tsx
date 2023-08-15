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

import React from "react";
import { type Expression } from "@/types/runtimeTypes";
import { render, fireEvent } from "@/pageEditor/testHelpers";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import CssSpacingWidget from "@/components/fields/schemaFields/widgets/cssClassWidgets/CssSpacingWidget";
import selectEvent from "react-select-event";

const renderWidget = (value: string | Expression) =>
  render(
    <CssSpacingWidget
      schema={{
        type: "string",
      }}
      label="spacing"
      name="cssClass"
    />,
    { initialValues: { cssClass: value } }
  );

beforeAll(() => {
  registerDefaultWidgets();
});

describe("CssClassWidget", () => {
  it("should render the spacing widget", () => {
    expect(renderWidget).toMatchSnapshot();
  });

  it("expand button works", () => {
    const { getByTestId, queryByTestId } = renderWidget("");
    const marginInput = getByTestId("m-input-container");
    const paddingInput = getByTestId("p-input-container");

    expect(marginInput).toBeInTheDocument();
    expect(paddingInput).toBeInTheDocument();
    expect(queryByTestId("m-t-input-container")).not.toBeInTheDocument();

    fireEvent.click(getByTestId("m-expand-button"));
    expect(getByTestId("m-t-input-container")).toBeInTheDocument();
  });

  it("clears the direction inputs when the main input is set", async () => {
    const { getByTestId, queryByTestId, getFormState } =
      renderWidget("test mr-1 mb-1");
    const marginInput = getByTestId("m-input-container");

    const selectContainerElement =
      getByTestId("m-input-container").querySelector("div");

    await selectEvent.select(selectContainerElement, "1");

    expect(getFormState()).toStrictEqual({ cssClass: "test m-1" });
  });

  it("clears the main input when the direction input is set", async () => {
    const { getByTestId, getFormState } = renderWidget("test m-1");

    fireEvent.click(getByTestId("m-expand-button"));

    const selectContainerElement = getByTestId(
      "m-t-input-container"
    ).querySelector("div");

    await selectEvent.select(selectContainerElement, "3");

    expect(getFormState()).toStrictEqual({ cssClass: "test mt-3" });
  });
});
