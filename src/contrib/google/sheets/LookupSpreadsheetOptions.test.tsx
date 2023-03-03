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
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { waitForEffect } from "@/testUtils/testHelpers";
import LookupSpreadsheetOptions from "@/contrib/google/sheets/LookupSpreadsheetOptions";
import { render } from "@/sidebar/testHelpers";
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

describe("LookupSpreadsheetOptions", () => {
  it("should render successfully", async () => {
    const rendered = render(
      <LookupSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: {
          config: {
            spreadsheetId: SPREADSHEET_ID,
            tabName: "",
            header: "",
            query: "",
            multi: false,
          },
        },
      }
    );

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("can choose tab and header values will load automatically", async () => {
    render(<LookupSpreadsheetOptions name="" configKey="config" />, {
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

    // Choose Tab1
    await userEvent.click(tabChooser);
    const tab1Option = await screen.findByText("Tab1");
    await userEvent.click(tab1Option);

    // Shows the header names for Tab1 in the dropdown
    const headerChooser = await screen.findByLabelText("Column Header");
    await userEvent.click(headerChooser);
    expect(screen.getByText("Column1")).toBeVisible();
    expect(screen.getByText("Column2")).toBeVisible();
    expect(screen.queryByText("Foo")).not.toBeInTheDocument();
    expect(screen.queryByText("Bar")).not.toBeInTheDocument();

    // Choose Tab2
    await userEvent.click(tabChooser);
    const tab2Option = await screen.findByText("Tab2");
    await userEvent.click(tab2Option);

    // Shows the header names for Tab2 in the dropdown
    await userEvent.click(headerChooser);
    expect(screen.getByText("Foo")).toBeVisible();
    expect(screen.getByText("Bar")).toBeVisible();
    expect(screen.queryByText("Column1")).not.toBeInTheDocument();
    expect(screen.queryByText("Column2")).not.toBeInTheDocument();
  });

  it("renders with variable inputs", async () => {
    const rendered = render(
      <LookupSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: {
          config: {
            spreadsheetId: SPREADSHEET_ID,
            tabName: makeVariableExpression("@myTab"),
            header: makeVariableExpression("@myHeader"),
            query: makeVariableExpression("@query"),
            multi: true,
          },
        },
      }
    );

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
