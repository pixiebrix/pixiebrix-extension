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
import { act, screen } from "@testing-library/react";
import {
  makeTemplateExpression,
  makeVariableExpression,
} from "@/runtime/expressionCreators";
import { validateRegistryId } from "@/types/helpers";
import selectEvent from "react-select-event";
import { render } from "@/pageEditor/testHelpers";
import {
  sanitizedServiceConfigurationFactory,
  uuidSequence,
} from "@/testUtils/factories";
import { services, sheets } from "@/background/messenger/api";
import {
  isGoogleInitialized,
  isGoogleSupported,
} from "@/contrib/google/initGoogle";

const TEST_SPREADSHEET_ID = uuidSequence(1);
const GOOGLE_SHEET_SERVICE_ID = validateRegistryId("google/sheet");

const servicesLocateMock = services.locate as jest.MockedFunction<
  typeof services.locate
>;

jest.mock("@/contrib/google/initGoogle", () => ({
  isGoogleInitialized: jest.fn().mockReturnValue(true),
  isGoogleSupported: jest.fn().mockReturnValue(true),
  subscribe: jest.fn().mockImplementation(() => () => {}),
}));

const isGoogleSupportedMock = isGoogleSupported as jest.MockedFunction<
  typeof isGoogleSupported
>;
const isGoogleInitializedMock = isGoogleInitialized as jest.MockedFunction<
  typeof isGoogleInitialized
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

beforeEach(() => {
  isGoogleInitializedMock.mockReturnValue(true);
  isGoogleSupportedMock.mockReturnValue(true);
});

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
  it("should render successfully with string spreadsheetId value and empty nunjucks tabName", async () => {
    const rendered = render(
      <LookupSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: {
          config: {
            spreadsheetId: TEST_SPREADSHEET_ID,
            tabName: makeTemplateExpression("nunjucks", ""),
            header: makeTemplateExpression("nunjucks", ""),
            query: makeTemplateExpression("nunjucks", ""),
            multi: false,
          },
        },
      }
    );

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("should render successfully with string spreadsheetId value and null tabName", async () => {
    const rendered = render(
      <LookupSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: {
          config: {
            spreadsheetId: TEST_SPREADSHEET_ID,
            tabName: null,
            header: makeTemplateExpression("nunjucks", ""),
            query: makeTemplateExpression("nunjucks", ""),
            multi: false,
          },
        },
      }
    );

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("should render successfully with string spreadsheetId value and selected tabName", async () => {
    const rendered = render(
      <LookupSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: {
          config: {
            spreadsheetId: TEST_SPREADSHEET_ID,
            tabName: "Tab2",
            header: makeTemplateExpression("nunjucks", ""),
            query: makeTemplateExpression("nunjucks", ""),
            multi: false,
          },
        },
      }
    );

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("loads in tab names and header values with string spreadsheetId value and empty nunjucks tabName", async () => {
    render(<LookupSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: TEST_SPREADSHEET_ID,
          tabName: makeTemplateExpression("nunjucks", ""),
          header: makeTemplateExpression("nunjucks", ""),
          query: makeTemplateExpression("nunjucks", ""),
          multi: false,
        },
      },
    });

    await waitForEffect();

    const tabChooser = await screen.findByLabelText("Tab Name");

    // Tab1 will be picked automatically since it's first in the list
    expect(screen.getByText("Tab1")).toBeVisible();

    let headerChooser = await screen.findByLabelText("Column Header");
    // Shows the header names for Tab1 in the dropdown
    selectEvent.openMenu(headerChooser);
    // Input value and select option in the dropdown, 2 instances
    const column1Options = screen.getAllByText("Column1");
    expect(column1Options).toHaveLength(2);
    expect(column1Options[0]).toBeVisible();
    expect(column1Options[1]).toBeVisible();
    expect(screen.getByText("Column2")).toBeVisible();
    // Does not show headers for Tab2
    expect(screen.queryByText("Foo")).not.toBeInTheDocument();
    expect(screen.queryByText("Bar")).not.toBeInTheDocument();

    // Choose Tab2
    await act(async () => {
      await selectEvent.select(tabChooser, "Tab2");
    });

    // Need to grab the chooser again because props changed and the header select component was re-rendered
    headerChooser = await screen.findByLabelText("Column Header");

    // Shows the header names for Tab2 in the dropdown
    selectEvent.openMenu(headerChooser);
    // Input value and select option in the dropdown, 2 instances
    const fooOptions = screen.getAllByText("Foo");
    expect(fooOptions).toHaveLength(2);
    expect(fooOptions[0]).toBeVisible();
    expect(fooOptions[1]).toBeVisible();
    expect(screen.getByText("Bar")).toBeVisible();
    // Does not show the headers for Tab1
    expect(screen.queryByText("Column1")).not.toBeInTheDocument();
    expect(screen.queryByText("Column2")).not.toBeInTheDocument();
  });

  it("loads in tab names and header values with mod input variable spreadsheetId value and empty nunjucks tabName", async () => {
    render(<LookupSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: makeVariableExpression("@options.sheetId"),
          tabName: makeTemplateExpression("nunjucks", ""),
          header: makeTemplateExpression("nunjucks", ""),
          query: makeTemplateExpression("nunjucks", ""),
          multi: false,
        },
        optionsArgs: {
          sheetId: TEST_SPREADSHEET_ID,
        },
      },
    });

    await waitForEffect();

    const tabChooser = await screen.findByLabelText("Tab Name");

    // Tab1 will be picked automatically since it's first in the list
    expect(screen.getByText("Tab1")).toBeVisible();

    // Shows the header names for Tab1 in the dropdown
    let headerChooser = await screen.findByLabelText("Column Header");
    selectEvent.openMenu(headerChooser);
    // Input value and select option in the dropdown, 2 instances
    const column1Options = screen.getAllByText("Column1");
    expect(column1Options).toHaveLength(2);
    expect(column1Options[0]).toBeVisible();
    expect(column1Options[1]).toBeVisible();
    expect(screen.getByText("Column2")).toBeVisible();
    // Does not show headers for Tab2
    expect(screen.queryByText("Foo")).not.toBeInTheDocument();
    expect(screen.queryByText("Bar")).not.toBeInTheDocument();

    // Choose Tab2
    await act(async () => {
      await selectEvent.select(tabChooser, "Tab2");
    });

    // Need to grab the chooser again because props changed and the header select component was re-rendered
    headerChooser = await screen.findByLabelText("Column Header");

    // Shows the header names for Tab2 in the dropdown
    selectEvent.openMenu(headerChooser);
    // Input value and select option in the dropdown, 2 instances
    const fooOptions = screen.getAllByText("Foo");
    expect(fooOptions).toHaveLength(2);
    expect(fooOptions[0]).toBeVisible();
    expect(fooOptions[1]).toBeVisible();

    expect(screen.getByText("Bar")).toBeVisible();
    expect(screen.queryByText("Column1")).not.toBeInTheDocument();
    expect(screen.queryByText("Column2")).not.toBeInTheDocument();
  });

  it("does not clear initial tabName and header values with string spreadsheetId value", async () => {
    render(<LookupSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: TEST_SPREADSHEET_ID,
          tabName: "Tab2",
          header: "Bar",
          query: makeTemplateExpression("nunjucks", "testQuery"),
          multi: true,
        },
      },
    });

    await waitForEffect();

    // Ensure title loaded
    expect(screen.getByDisplayValue("Test Sheet")).toBeVisible();
    // Ensure tab name has not changed -- use getByText for react-select value
    expect(screen.getByText("Tab2")).toBeVisible();
    // Ensure header has not changed -- use getByText for react-select value
    expect(screen.getByText("Bar")).toBeVisible();
    expect(screen.getByDisplayValue("testQuery")).toBeVisible();
  });

  it("does not clear initial variable values", async () => {
    render(<LookupSpreadsheetOptions name="" configKey="config" />, {
      initialValues: {
        config: {
          spreadsheetId: makeVariableExpression("@options.sheetId"),
          tabName: makeVariableExpression("@myTab"),
          header: makeVariableExpression("@myHeader"),
          query: makeVariableExpression("@query"),
          multi: true,
        },
        optionsArgs: {
          sheetId: TEST_SPREADSHEET_ID,
        },
      },
    });

    await waitForEffect();

    // Ensure tab name has not changed -- use getByText for react-select value
    expect(screen.getByDisplayValue("@options.sheetId")).toBeVisible();
    expect(screen.getByDisplayValue("@myTab")).toBeVisible();
    expect(screen.getByDisplayValue("@myHeader")).toBeVisible();
    expect(screen.getByDisplayValue("@query")).toBeVisible();
  });

  it("should require GAPI support", async () => {
    isGoogleInitializedMock.mockReturnValue(false);
    isGoogleSupportedMock.mockReturnValue(false);

    const rendered = render(
      <LookupSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: { config: {} },
      }
    );

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("should require GAPI loaded", async () => {
    isGoogleInitializedMock.mockReturnValue(false);
    isGoogleSupportedMock.mockReturnValue(true);

    const rendered = render(
      <LookupSpreadsheetOptions name="" configKey="config" />,
      {
        initialValues: { config: {} },
      }
    );

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
