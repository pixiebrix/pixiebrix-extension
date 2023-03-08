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
import { render } from "@/sidebar/testHelpers";
import AppendSpreadsheetOptions from "./AppendSpreadsheetOptions";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { waitForEffect } from "@/testUtils/testHelpers";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { makeVariableExpression } from "@/runtime/expressionCreators";

const SPREADSHEET_ID = "testId";

jest.mock("@/contrib/google/sheets/useSpreadsheetId", () => ({
  __esModule: true,
  default: () => SPREADSHEET_ID,
}));

jest.mock("@/background/messenger/api", () => ({
  __esModule: true,
  sheets: {
    getSheetProperties: jest.fn().mockResolvedValue({ title: "Test Sheet" }),
    getTabNames: jest.fn().mockResolvedValue(["Tab1", "Tab2"]),
    getHeaders: jest.fn().mockImplementation(({ tabName }) => {
      if (tabName === "Tab1") {
        return ["Column1", "Column2"];
      }

      return ["Foo", "Bar"];
    }),
  },
}));

beforeAll(() => {
  registerDefaultWidgets();
});

describe("AppendSpreadsheetOptions", () => {
  it("should render successfully", async () => {
    const rendered = render(
      <AppendSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: {
          config: {
            spreadsheetId: SPREADSHEET_ID,
            tabName: "",
            rowValues: {},
          },
        },
      }
    );

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("can choose tab and row values will load automatically", async () => {
    render(<AppendSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: SPREADSHEET_ID,
          tabName: "",
          rowValues: {},
        },
      },
    });

    await waitForEffect();

    const tabChooser = await screen.findByLabelText("Tab Name");

    // Tab1 will be picked automatically since it's first in the list
    expect(screen.getByText("Tab1")).toBeVisible();

    // Shows the header names for Tab1
    expect(screen.getByDisplayValue("Column1")).toBeVisible();
    expect(screen.getByDisplayValue("Column2")).toBeVisible();
    expect(screen.queryByDisplayValue("Foo")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Bar")).not.toBeInTheDocument();

    // Choose Tab2
    await userEvent.click(tabChooser);
    const tab2Option = await screen.findByText("Tab2");
    await userEvent.click(tab2Option);

    // Shows the header names for Tab2
    expect(screen.getByDisplayValue("Foo")).toBeVisible();
    expect(screen.getByDisplayValue("Bar")).toBeVisible();
    expect(screen.queryByDisplayValue("Column1")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Column2")).not.toBeInTheDocument();
  });

  it("allows any rowValues fields for variable tab name", async () => {
    render(<AppendSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: SPREADSHEET_ID,
          tabName: makeVariableExpression("@mySheetTab"),
          rowValues: {},
        },
      },
    });

    await waitForEffect();

    // Ensure that no header names have been loaded into the rowValues field
    expect(screen.queryByDisplayValue("Column1")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Column2")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Foo")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Bar")).not.toBeInTheDocument();
  });

  it("does not clear initial values on first render", async () => {
    render(<AppendSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: SPREADSHEET_ID,
          tabName: "Tab2",
          rowValues: {
            Foo: "valueA",
            Bar: "valueB",
          },
        },
      },
    });

    await waitForEffect();

    // Ensure title loaded
    expect(screen.getByDisplayValue("Test Sheet")).toBeVisible();
    // Ensure tab name has not changed -- use getByText for react-select value
    expect(screen.getByText("Tab2")).toBeVisible();
    // Ensure row values have both names and values
    expect(screen.getByDisplayValue("Foo")).toBeVisible();
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("Bar")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();
  });
});
