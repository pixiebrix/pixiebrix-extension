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
  it("should render with raw sheetId value", async () => {
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

  it("should render with service sheetId value", async () => {});
});
