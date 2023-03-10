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
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  makeTemplateExpression,
  makeVariableExpression,
} from "@/runtime/expressionCreators";
import { useAuthOptions } from "@/hooks/auth";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import selectEvent from "react-select-event";
import { noop } from "lodash";
import { render } from "@/pageEditor/testHelpers";
import {
  sanitizedServiceConfigurationFactory,
  uuidSequence,
} from "@/testUtils/factories";
import { services, sheets } from "@/background/messenger/api";

const TEST_SPREADSHEET_ID = uuidSequence(1);
const GOOGLE_SHEET_SERVICE_ID = validateRegistryId("google/sheet");

const servicesLocateMock = services.locate as jest.MockedFunction<
  typeof services.locate
>;

jest.mock("@/components/fields/schemaFields/serviceFieldUtils", () => ({
  ...jest.requireActual("@/components/fields/schemaFields/serviceFieldUtils"),
  // Mock so we don't have to have full Page Editor state in tests
  produceExcludeUnusedDependencies: jest.fn().mockImplementation((x: any) => x),
}));

jest.mock("@/hooks/auth", () => ({
  __esModule: true,
  useAuthOptions: jest.fn().mockReturnValue([[], () => {}]),
}));

const getSheetPropertiesMock = sheets.getSheetProperties as jest.MockedFunction<
  typeof sheets.getSheetProperties
>;

const getTabNamesMock = sheets.getTabNames as jest.MockedFunction<
  typeof sheets.getTabNames
>;

const getHeadersMock = sheets.getHeaders as jest.MockedFunction<
  typeof sheets.getHeaders
>;

const useAuthOptionsMock = useAuthOptions as jest.MockedFunction<
  typeof useAuthOptions
>;

beforeAll(() => {
  registerDefaultWidgets();
  servicesLocateMock.mockResolvedValue(
    sanitizedServiceConfigurationFactory({
      serviceId: GOOGLE_SHEET_SERVICE_ID,
      // @ts-expect-error -- The type here is a record with a _brand field, so casting doesn't work
      config: {
        spreadsheetId: TEST_SPREADSHEET_ID,
      },
    })
  );
  getSheetPropertiesMock.mockResolvedValue({ title: "Test Sheet" });
  getTabNamesMock.mockResolvedValue(["Tab1", "Tab2"]);
  getHeadersMock.mockImplementation(async ({ tabName }) => {
    if (tabName === "Tab1") {
      return ["Column1", "Column2"];
    }

    return ["Foo", "Bar"];
  });
});

describe("LookupSpreadsheetOptions", () => {
  it("should render successfully", async () => {
    const rendered = render(
      <LookupSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: {
          config: {
            spreadsheetId: TEST_SPREADSHEET_ID,
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

  it("should show tab names automatically when config is selected, when starting with a blank nunjucks tabName", async () => {
    useAuthOptionsMock.mockReturnValue([
      [
        // Provide 2 so ServiceSelectWidget won't select one by default
        {
          label: "Test 1",
          value: uuidv4(),
          local: true,
          serviceId: validateRegistryId("google/sheet"),
        },
        {
          label: "Test 2",
          value: uuidv4(),
          local: true,
          serviceId: validateRegistryId("google/sheet"),
        },
      ],
      noop,
    ]);

    render(<LookupSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        // This state is possible if the user takes these steps:
        // 1. Select a spreadsheet integration configuration
        // 2. Type something into the tabName field, then delete, so
        //    it turns from null into an empty nunjucks template expression
        // 3. Click the x to clear the spreadsheet field
        config: {
          // Causes integration configuration checker to be shown
          spreadsheetId: null,
          tabName: makeTemplateExpression("nunjucks", ""),
          rowValues: {},
        },
        services: [],
      },
    });

    await waitForEffect();

    // Simulate user selecting a sheet integration configuration
    const spreadsheetSelect = await screen.findByLabelText("Spreadsheet");
    await selectEvent.select(spreadsheetSelect, "Test 1");

    // Toggle the Tab Name field to select
    const tabNameToggle = screen
      .getByTestId("toggle-config.tabName")
      .querySelector("button");
    await selectEvent.select(tabNameToggle, "Select...");

    const tabOption = await screen.findByText("Tab1");
    expect(tabOption).toBeVisible();

    // Ensure headers loaded in for Tab1
    const headerSelect = await screen.findByLabelText("Column Header");
    selectEvent.openMenu(headerSelect);
    // Input value and select option in the dropdown, 2 instances
    const column1Options = screen.getAllByText("Column1");
    expect(column1Options).toHaveLength(2);
    expect(column1Options[0]).toBeVisible();
    expect(column1Options[1]).toBeVisible();

    expect(screen.getByText("Column2")).toBeVisible();
    expect(screen.queryByText("Foo")).not.toBeInTheDocument();
    expect(screen.queryByText("Bar")).not.toBeInTheDocument();
  });

  it("can choose tab and header values will load automatically", async () => {
    render(<LookupSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: TEST_SPREADSHEET_ID,
          tabName: "",
          rowValues: {},
        },
      },
    });

    await waitForEffect();

    const tabChooser = await screen.findByLabelText("Tab Name");

    // Tab1 will be picked automatically since it's first in the list
    expect(screen.getByText("Tab1")).toBeVisible();

    // Shows the header names for Tab1 in the dropdown
    const headerSelect = await screen.findByLabelText("Column Header");
    selectEvent.openMenu(headerSelect);
    // Input value and select option in the dropdown, 2 instances
    const column1Options = screen.getAllByText("Column1");
    expect(column1Options).toHaveLength(2);
    expect(column1Options[0]).toBeVisible();
    expect(column1Options[1]).toBeVisible();

    expect(screen.getByText("Column2")).toBeVisible();
    expect(screen.queryByText("Foo")).not.toBeInTheDocument();
    expect(screen.queryByText("Bar")).not.toBeInTheDocument();

    // Choose Tab2
    await userEvent.click(tabChooser);
    const tab2Option = await screen.findByText("Tab2");
    await userEvent.click(tab2Option);

    // Shows the header names for Tab2 in the dropdown
    selectEvent.openMenu(headerSelect);
    // Input value and select option in the dropdown, 2 instances
    const fooOptions = screen.getAllByText("Foo");
    expect(fooOptions).toHaveLength(2);
    expect(fooOptions[0]).toBeVisible();
    expect(fooOptions[1]).toBeVisible();

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
            spreadsheetId: TEST_SPREADSHEET_ID,
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
