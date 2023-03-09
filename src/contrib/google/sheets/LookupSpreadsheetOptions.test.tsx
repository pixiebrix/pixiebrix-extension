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
import { tick } from "@/extensionPoints/extensionPointTestUtils";
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

  it("should show tab names automatically when config is selected", async () => {
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

    const rendered = render(
      <LookupSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: {
          config: {
            // Causes integration configuration checker to be shown
            spreadsheetId: null,
            // XXX: the test passes if this starts as "", but not if it's a blank expression
            // That's because the TabField only defaults if the value is null
            tabName: makeTemplateExpression("nunjucks", ""),
            rowValues: {},
          },
          services: [],
        },
      }
    );

    await waitForEffect();

    // Simulate user selecting a sheet integration configuration
    const spreadsheetSelect = await screen.findByLabelText("Spreadsheet");
    await selectEvent.select(spreadsheetSelect, "Test 1");

    // Wait for tab names to load/default
    await waitForEffect();
    await tick();

    screen.debug(undefined, 100_000);

    const tabOption = await screen.findByText("Tab1");
    expect(tabOption).toBeVisible();

    expect(rendered.asFragment()).toMatchSnapshot();
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
    const headerChooser = await screen.findByLabelText("Column Header");
    await userEvent.click(headerChooser);
    // TODO: This check fails because Column1 appears twice, in the field value and dropdown option.
    //  We should convert this test to use react-select-event
    // expect(screen.getByText("Column1")).toBeVisible();
    expect(screen.getByText("Column2")).toBeVisible();
    expect(screen.queryByText("Foo")).not.toBeInTheDocument();
    expect(screen.queryByText("Bar")).not.toBeInTheDocument();

    // Choose Tab2
    await userEvent.click(tabChooser);
    const tab2Option = await screen.findByText("Tab2");
    await userEvent.click(tab2Option);

    // Shows the header names for Tab2 in the dropdown
    await userEvent.click(headerChooser);
    // TODO: This check fails because Foo appears twice, in the field value and dropdown option.
    //  We should convert this test to use react-select-event
    // expect(screen.getByText("Foo")).toBeVisible();
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
