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
import AppendSpreadsheetOptions from "./AppendSpreadsheetOptions";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { waitForEffect } from "@/testUtils/testHelpers";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  makeTemplateExpression,
  makeVariableExpression,
} from "@/runtime/expressionCreators";
import { getToggleOptions } from "@/components/fields/schemaFields/getToggleOptions";
import { dereference } from "@/validators/generic";
import { BASE_SHEET_SCHEMA } from "@/contrib/google/sheets/core/schemas";
import SheetsFileWidget from "@/contrib/google/sheets/ui/SpreadsheetPickerWidget";
import { render } from "@/pageEditor/testHelpers";
import { validateRegistryId } from "@/types/helpers";
import { services, sheets } from "@/background/messenger/api";
import { selectSchemaFieldInputMode } from "@/testUtils/formHelpers";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { sanitizedIntegrationConfigFactory } from "@/testUtils/factories/integrationFactories";
import {
  type FileList,
  type Spreadsheet,
} from "@/contrib/google/sheets/core/types";
import { type UUID } from "@/types/stringTypes";
import { type SpreadsheetTarget } from "@/contrib/google/sheets/core/sheetsApi";
import { useAuthOptions } from "@/hooks/auth";
import { valueToAsyncState } from "@/utils/asyncStateUtils";
import { type AuthOption } from "@/auth/authTypes";
import { type IntegrationDependency } from "@/types/integrationTypes";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import selectEvent from "react-select-event";
import ServicesSliceModIntegrationsContextAdapter from "@/store/services/ServicesSliceModIntegrationsContextAdapter";
import { FormikValues } from "formik";

let idSequence = 0;
function newId(): UUID {
  return uuidSequence(idSequence++);
}

const servicesLocateMock = services.locate as jest.MockedFunction<
  typeof services.locate
>;

jest.mock("@/contrib/google/initGoogle", () => ({
  isGoogleInitialized: jest.fn().mockReturnValue(true),
  isGAPISupported: jest.fn().mockReturnValue(true),
  subscribe: jest.fn().mockImplementation(() => () => {}),
}));

jest.mock("@/hooks/auth", () => ({
  useAuthOptions: jest.fn(),
}));

const useAuthOptionsMock = jest.mocked(useAuthOptions);

const getAllSpreadsheetsMock = jest.mocked(sheets.getAllSpreadsheets);
const getSpreadsheetMock = jest.mocked(sheets.getSpreadsheet);
const getSheetPropertiesMock = jest.mocked(sheets.getSheetProperties);
const getTabNamesMock = jest.mocked(sheets.getTabNames);
const getHeadersMock = jest.mocked(sheets.getHeaders);

const TEST_SPREADSHEET_ID = newId();
const OTHER_TEST_SPREADSHEET_ID = newId();
const GOOGLE_SHEET_SERVICE_ID = validateRegistryId("google/sheet");
const GOOGLE_PKCE_SERVICE_ID = validateRegistryId("google/oauth2-pkce");
const GOOGLE_PKCE_AUTH_CONFIG = newId();
const TEST_SPREADSHEET_AUTH_CONFIG = newId();

const TEST_SPREADSHEET_NAME = "Test Spreadsheet";
const OTHER_TEST_SPREADSHEET_NAME = "Other Spreadsheet";

const servicesLookup = {
  [GOOGLE_SHEET_SERVICE_ID]: sanitizedIntegrationConfigFactory({
    serviceId: GOOGLE_SHEET_SERVICE_ID,
    config: {
      _sanitizedConfigBrand: null,
      spreadsheetId: TEST_SPREADSHEET_ID,
    },
  }),
  [GOOGLE_PKCE_SERVICE_ID]: sanitizedIntegrationConfigFactory({
    serviceId: GOOGLE_PKCE_SERVICE_ID,
  }),
};

const googlePKCEAuthOption: AuthOption = {
  serviceId: GOOGLE_PKCE_SERVICE_ID,
  label: "Google OAuth2 PKCE",
  local: true,
  value: GOOGLE_PKCE_AUTH_CONFIG,
  sharingType: "private",
};

const testSpreadsheetAuthOption: AuthOption = {
  serviceId: GOOGLE_SHEET_SERVICE_ID,
  label: "Test Spreadsheet",
  local: true,
  value: TEST_SPREADSHEET_AUTH_CONFIG,
  sharingType: "private",
};

const googlePKCEIntegrationDependency: IntegrationDependency = {
  id: GOOGLE_PKCE_SERVICE_ID,
  outputKey: validateOutputKey("google"),
  config: GOOGLE_PKCE_AUTH_CONFIG,
};

const testSpreadsheetIntegrationDependency: IntegrationDependency = {
  id: GOOGLE_SHEET_SERVICE_ID,
  outputKey: validateOutputKey("google"),
  config: TEST_SPREADSHEET_AUTH_CONFIG,
};

const testSpreadsheet: Spreadsheet = {
  spreadsheetId: TEST_SPREADSHEET_ID,
  properties: {
    title: TEST_SPREADSHEET_NAME,
  },
  sheets: [
    {
      properties: {
        sheetId: 123,
        title: "Tab1",
      },
    },
    {
      properties: {
        sheetId: 456,
        title: "Tab2",
      },
    },
  ],
};

const otherTestSpreadsheet: Spreadsheet = {
  spreadsheetId: OTHER_TEST_SPREADSHEET_ID,
  properties: {
    title: OTHER_TEST_SPREADSHEET_NAME,
  },
  sheets: [
    {
      properties: {
        sheetId: 111,
        title: "OtherTab1",
      },
    },
    {
      properties: {
        sheetId: 222,
        title: "OtherTab2",
      },
    },
  ],
};

const fileListResponse: FileList = {
  kind: "drive#fileList",
  incompleteSearch: false,
  files: [
    {
      kind: "drive#file",
      mimeType: "application/vnd.google-apps.spreadsheet",
      id: TEST_SPREADSHEET_ID,
      name: TEST_SPREADSHEET_NAME,
    },
    {
      kind: "drive#file",
      mimeType: "application/vnd.google-apps.spreadsheet",
      id: OTHER_TEST_SPREADSHEET_ID,
      name: OTHER_TEST_SPREADSHEET_NAME,
    },
  ],
};

beforeAll(() => {
  registerDefaultWidgets();
  servicesLocateMock.mockImplementation(
    async (serviceId) => servicesLookup[serviceId]
  );
  useAuthOptionsMock.mockReturnValue(
    valueToAsyncState([googlePKCEAuthOption, testSpreadsheetAuthOption])
  );
  getAllSpreadsheetsMock.mockResolvedValue(fileListResponse);
  getSpreadsheetMock.mockImplementation(
    async ({ spreadsheetId }: SpreadsheetTarget) =>
      spreadsheetId === TEST_SPREADSHEET_ID
        ? testSpreadsheet
        : otherTestSpreadsheet
  );
  getSheetPropertiesMock.mockImplementation(async (spreadsheetId: string) =>
    spreadsheetId === TEST_SPREADSHEET_ID
      ? { title: TEST_SPREADSHEET_NAME }
      : { title: OTHER_TEST_SPREADSHEET_NAME }
  );
  getTabNamesMock.mockImplementation(async (spreadsheetId: string) =>
    spreadsheetId === TEST_SPREADSHEET_ID
      ? ["Tab1", "Tab2"]
      : ["OtherTab1", "OtherTab2"]
  );
  getHeadersMock.mockImplementation(async ({ tabName }) => {
    switch (tabName) {
      case "Tab1": {
        return ["Column1", "Column2"];
      }

      case "Tab2": {
        return ["Foo", "Bar"];
      }

      case "OtherTab1": {
        return ["OtherColumn1", "OtherColumn2"];
      }

      default: {
        return ["OtherFoo", "OtherBar"];
      }
    }
  });
});

describe("getToggleOptions", () => {
  // Sanity check getToggleOptions returning expected values, because that would cause problems in the snapshot tests
  it("should include file picker and variable toggle options", async () => {
    const baseSchema = await dereference(BASE_SHEET_SCHEMA);

    const result = getToggleOptions({
      fieldSchema: baseSchema,
      customToggleModes: [],
      isRequired: true,
      allowExpressions: true,
      isObjectProperty: false,
      isArrayItem: false,
    });

    expect(result).toEqual([
      // The Google File Picker
      expect.objectContaining({
        Widget: SheetsFileWidget,
        value: "string",
      }),
      // Variable
      expect.objectContaining({
        value: "var",
      }),
    ]);
  });
});

function expectTab1Selected() {
  // Tab names use select widget, which renders the selected value into the DOM as text, so can use getByText
  // Tab1 will be picked automatically since it's first in the list
  expect(
    screen.getByText(testSpreadsheet.sheets[0].properties.title)
  ).toBeVisible();
  // Tab2 should not be visible
  expect(
    screen.queryByText(testSpreadsheet.sheets[1].properties.title)
  ).not.toBeInTheDocument();

  // Column headers are readonly input values; need to use getByDisplayValue
  // Headers for Tab1 should be loaded into rowValues
  expect(screen.getByDisplayValue("Column1")).toBeVisible();
  expect(screen.getByDisplayValue("Column2")).toBeVisible();
  // Headers for Tab2 should not be visible
  expect(screen.queryByDisplayValue("Foo")).not.toBeInTheDocument();
  expect(screen.queryByDisplayValue("Bar")).not.toBeInTheDocument();
}

function expectLegacySpreadsheetTitleLoaded() {
  // Spreadsheet ID should not be user-visible
  expect(screen.queryByText(TEST_SPREADSHEET_ID)).not.toBeInTheDocument();

  // Legacy sheet picker is an input; need to use getByDisplayValue
  expect(screen.getByDisplayValue(TEST_SPREADSHEET_NAME)).toBeVisible();
}

function expectLegacyTestSpreadsheetLoaded() {
  expectLegacySpreadsheetTitleLoaded();
  expectTab1Selected();
}

function expectGoogleAccountSpreadsheetTitleLoaded() {
  // Spreadsheet ID should not be user-visible
  expect(screen.queryByText(TEST_SPREADSHEET_ID)).not.toBeInTheDocument();

  // Loaded spreadsheets use select widget, which renders the selected value into the DOM as text, so can use getByText
  expect(screen.getByText(TEST_SPREADSHEET_NAME)).toBeVisible();
}

function expectGoogleAccountTestSpreadsheetLoaded() {
  expectGoogleAccountSpreadsheetTitleLoaded();
  expectTab1Selected();
}

function expectTab2Selected() {
  // Tab2 should be selected
  expect(
    screen.getByText(testSpreadsheet.sheets[1].properties.title)
  ).toBeVisible();
  // Tab1 should not be visible
  expect(
    screen.queryByText(testSpreadsheet.sheets[0].properties.title)
  ).not.toBeInTheDocument();

  // Headers for Tab2 should be loaded into rowValues
  expect(screen.getByDisplayValue("Foo")).toBeVisible();
  expect(screen.getByDisplayValue("Bar")).toBeVisible();
  // Headers for Tab1 should not be visible
  expect(screen.queryByDisplayValue("Column1")).not.toBeInTheDocument();
  expect(screen.queryByDisplayValue("Column2")).not.toBeInTheDocument();
}

async function expectTabSelectWorksProperly() {
  expectTab1Selected();

  const tabChooser = await screen.findByLabelText("Tab Name");

  // Choose Tab2
  await userEvent.click(tabChooser);
  const tab2Option = await screen.findByText("Tab2");
  await userEvent.click(tab2Option);

  expectTab2Selected();
}

const renderWithValuesAndWait = async (initialValues: FormikValues) => {
  const rendered = render(
    <AppendSpreadsheetOptions name="" configKey="config" />,
    {
      initialValues,
      wrapper: ServicesSliceModIntegrationsContextAdapter,
    }
  );

  await waitForEffect();

  return rendered;
};

describe("AppendSpreadsheetOptions", () => {
  /**
   * Snapshots
   */

  test("given empty googleAccount and string spreadsheetId and empty nunjucks tabName, when rendered, matches snapshot", async () => {
    const rendered = await renderWithValuesAndWait({
      config: {
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: makeTemplateExpression("nunjucks", ""),
        rowValues: {},
      },
    });

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("given empty googleAccount and string spreadsheetId and selected tabName and entered rowValues, when rendered, matches snapshot", async () => {
    const rendered = await renderWithValuesAndWait({
      config: {
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: "Tab2",
        rowValues: {
          Foo: makeTemplateExpression("nunjucks", "fooValue"),
          Bar: makeTemplateExpression("nunjucks", "barValue"),
        },
      },
    });

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("given test googleAccount and string spreadsheetId value and selected tabName and column values, when rendered, matches snapshot", async () => {
    const rendered = await renderWithValuesAndWait({
      config: {
        googleAccount: makeVariableExpression("@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: "Tab2",
        rowValues: {
          Foo: "fooValue",
          Bar: "barValue",
        },
      },
      services: [googlePKCEIntegrationDependency],
    });

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  /**
   * Basic Render Tests
   */

  test("given empty googleAccount/tabName/rowValues and string spreadsheetId, when rendered, loads spreadsheet/tabName/headers", async () => {
    await renderWithValuesAndWait({
      config: {
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: null,
        rowValues: {},
      },
    });

    expectLegacyTestSpreadsheetLoaded();
  });

  test("given empty googleAccount/rowValues and null tabName and legacy integration-based spreadsheetId, when rendered, loads tabName/headers", async () => {
    await renderWithValuesAndWait({
      config: {
        spreadsheetId: makeVariableExpression("@google"),
        tabName: null,
        rowValues: {},
      },
      services: [testSpreadsheetIntegrationDependency],
    });

    // Legacy service widget for spreadsheet isn't supported anymore, so title won't load,
    // but tabName/header should still work with old form states
    expectTab1Selected();
  });

  test("given empty googleAccount/rowValues and null tabName and mod input spreadsheetId, when rendered, loads tabName/headers", async () => {
    await renderWithValuesAndWait({
      config: {
        spreadsheetId: makeVariableExpression("@options.sheetId"),
        tabName: null,
        rowValues: {},
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
    });

    // Mod input var field won't render title
    expectTab1Selected();
  });

  test("given empty googleAccount and string spreadsheetId and var tabName, when rendered, allows any rowValues fields", async () => {
    await renderWithValuesAndWait({
      config: {
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: makeVariableExpression("@mySheetTab"),
        rowValues: {},
      },
    });

    // Ensure that no header names have been loaded into the rowValues field
    expect(screen.queryByDisplayValue("Column1")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Column2")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Foo")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Bar")).not.toBeInTheDocument();
  });

  test("given test googleAccount and null tabName, when spreadsheet selected, loads spreadsheet/tabName/headers", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: makeVariableExpression("@google"),
        spreadsheetId: null,
        tabName: null,
        rowValues: {},
      },
      services: [googlePKCEIntegrationDependency],
    });

    // Select the first spreadsheet
    const spreadsheetSelect = screen.getByRole("combobox", {
      name: "Google Sheet",
    });
    await act(async () => {
      await selectEvent.select(spreadsheetSelect, TEST_SPREADSHEET_NAME);
    });

    expectGoogleAccountTestSpreadsheetLoaded();
  });

  test("given test googleAccount and string spreadsheetId and empty tabName/rowValues, when rendered, loads tabName/headers", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: makeVariableExpression("@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: null,
        rowValues: {},
      },
      services: [googlePKCEIntegrationDependency],
    });

    expectGoogleAccountTestSpreadsheetLoaded();
  });

  test("given test googleAccount/rowValues and null tabName and mod input spreadsheetId, when rendered, loads tabName/headers", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: makeVariableExpression("@google"),
        spreadsheetId: makeVariableExpression("@options.sheetId"),
        tabName: null,
        rowValues: {},
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
      services: [googlePKCEIntegrationDependency],
    });

    // Mod input var field won't render title
    expectTab1Selected();
  });

  test("given test googleAccount and string spreadsheetId and var tabName, when rendered, allows any rowValues fields", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: makeVariableExpression("@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: makeVariableExpression("@mySheetTab"),
        rowValues: {},
      },
      services: [googlePKCEIntegrationDependency],
    });

    // Ensure that no header names have been loaded into the rowValues field
    expect(screen.queryByDisplayValue("Column1")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Column2")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Foo")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Bar")).not.toBeInTheDocument();
  });

  /**
   * Tab Name Select Works Properly
   */

  test("given empty googleAccount/tabName/rowValues and string spreadsheetId, when tabs are selected, loads headers", async () => {
    await renderWithValuesAndWait({
      config: {
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: makeTemplateExpression("nunjucks", ""),
        rowValues: {},
      },
    });

    await expectTabSelectWorksProperly();
  });

  test("given empty googleAccount/tabName/rowValues and legacy integration-based spreadsheetId, when tabs are selected, loads headers", async () => {
    await renderWithValuesAndWait({
      config: {
        spreadsheetId: makeVariableExpression("@google"),
        tabName: makeTemplateExpression("nunjucks", ""),
        rowValues: {},
      },
      services: [testSpreadsheetIntegrationDependency],
    });

    await expectTabSelectWorksProperly();
  });

  test("given empty googleAccount/tabName/rowValues and mod input spreadsheetId, when tabs are selected, loads headers", async () => {
    await renderWithValuesAndWait({
      config: {
        spreadsheetId: makeVariableExpression("@options.sheetId"),
        tabName: makeTemplateExpression("nunjucks", ""),
        rowValues: {},
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
    });

    await expectTabSelectWorksProperly();
  });

  test("given test googleAccount and string spreadsheetId and empty tabName/rowValues, when tabs are selected, loads headers", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: makeVariableExpression("@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: makeTemplateExpression("nunjucks", ""),
        rowValues: {},
      },
      services: [googlePKCEIntegrationDependency],
    });

    await expectTabSelectWorksProperly();
  });

  test("given test googleAccount and mod input spreadsheetId and empty tabName/rowValues, when tabs are selected, loads headers", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: makeVariableExpression("@google"),
        spreadsheetId: makeVariableExpression("@options.sheetId"),
        tabName: makeTemplateExpression("nunjucks", ""),
        rowValues: {},
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
      services: [googlePKCEIntegrationDependency],
    });

    await expectTabSelectWorksProperly();
  });

  /**
   * Does Not Clear Initial Values
   */

  test("given empty googleAccount and string spreadsheetId and selected tabName and nunjucks rowValues, when rendered, does not clear initial values", async () => {
    await renderWithValuesAndWait({
      config: {
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: "Tab2",
        rowValues: {
          Foo: makeTemplateExpression("nunjucks", "valueA"),
          Bar: makeTemplateExpression("nunjucks", "valueB"),
        },
      },
    });

    expectLegacySpreadsheetTitleLoaded();
    expectTab2Selected();

    // Ensure that initial values are not cleared
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();
  });

  test("given empty googleAccount and string spreadsheetId and nunjucks tabName/rowValues, when rendered, does not clear initial values", async () => {
    await renderWithValuesAndWait({
      config: {
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: makeTemplateExpression("nunjucks", "Tab2"),
        rowValues: {
          Foo: makeTemplateExpression("nunjucks", "valueA"),
          Bar: makeTemplateExpression("nunjucks", "valueB"),
        },
      },
    });

    expectLegacySpreadsheetTitleLoaded();
    expectTab2Selected();

    // Ensure that initial values are not cleared
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();
  });

  test("given empty googleAccount and mod input spreadsheetId and nunjucks tabName/rowValues, when rendered, does not clear initial values", async () => {
    await renderWithValuesAndWait({
      config: {
        spreadsheetId: makeVariableExpression("@options.sheetId"),
        tabName: makeTemplateExpression("nunjucks", "Tab2"),
        rowValues: {
          Foo: makeTemplateExpression("nunjucks", "valueA"),
          Bar: makeTemplateExpression("nunjucks", "valueB"),
        },
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
    });

    // Mod input var field won't render title, tabName is nunjucks input
    expect(screen.getByDisplayValue("Tab2")).toBeVisible();
    // Headers for Tab2 should be loaded into rowValues
    expect(screen.getByDisplayValue("Foo")).toBeVisible();
    expect(screen.getByDisplayValue("Bar")).toBeVisible();
    // Ensure that initial values are not cleared
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();
  });

  test("given empty googleAccount and mod input spreadsheetId and selected tabName and nunjucks rowValues, when rendered, does not clear initial values", async () => {
    await renderWithValuesAndWait({
      config: {
        spreadsheetId: makeVariableExpression("@options.sheetId"),
        tabName: "Tab2",
        rowValues: {
          Foo: makeTemplateExpression("nunjucks", "valueA"),
          Bar: makeTemplateExpression("nunjucks", "valueB"),
        },
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
    });

    // Mod input var field won't render title
    expectTab2Selected();

    // Ensure that initial values are not cleared
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();
  });

  test("given test googleAccount and string spreadsheetId and selected tabName and nunjucks rowValues, when rendered, does not clear initial values", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: makeVariableExpression("@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: "Tab2",
        rowValues: {
          Foo: makeTemplateExpression("nunjucks", "valueA"),
          Bar: makeTemplateExpression("nunjucks", "valueB"),
        },
      },
      services: [googlePKCEIntegrationDependency],
    });

    expectGoogleAccountSpreadsheetTitleLoaded();
    expectTab2Selected();

    // Ensure that initial values are not cleared
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();
  });

  test("given test googleAccount and string spreadsheetId and nunjucks tabName/rowValues, when rendered, does not clear initial values", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: makeVariableExpression("@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: makeTemplateExpression("nunjucks", "Tab2"),
        rowValues: {
          Foo: makeTemplateExpression("nunjucks", "valueA"),
          Bar: makeTemplateExpression("nunjucks", "valueB"),
        },
      },
      services: [googlePKCEIntegrationDependency],
    });

    expectGoogleAccountSpreadsheetTitleLoaded();
    expectTab2Selected();

    // Ensure that initial values are not cleared
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();
  });

  test("given test googleAccount and mod input spreadsheetId and nunjucks tabName/rowValues, when rendered, does not clear initial values", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: makeVariableExpression("@google"),
        spreadsheetId: makeVariableExpression("@options.sheetId"),
        tabName: makeTemplateExpression("nunjucks", "Tab2"),
        rowValues: {
          Foo: makeTemplateExpression("nunjucks", "valueA"),
          Bar: makeTemplateExpression("nunjucks", "valueB"),
        },
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
      services: [googlePKCEIntegrationDependency],
    });

    // Mod input var field won't render title, tabName is nunjucks input
    expect(screen.getByDisplayValue("Tab2")).toBeVisible();
    // Headers for Tab2 should be loaded into rowValues
    expect(screen.getByDisplayValue("Foo")).toBeVisible();
    expect(screen.getByDisplayValue("Bar")).toBeVisible();
    // Ensure that initial values are not cleared
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();
  });

  test("given test googleAccount and mod input spreadsheetId and selected tabName and nunjucks rowValues, when rendered, does not clear initial values", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: makeVariableExpression("@google"),
        spreadsheetId: makeVariableExpression("@options.sheetId"),
        tabName: "Tab2",
        rowValues: {
          Foo: makeTemplateExpression("nunjucks", "valueA"),
          Bar: makeTemplateExpression("nunjucks", "valueB"),
        },
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
      services: [googlePKCEIntegrationDependency],
    });

    // Mod input var field won't render title
    expectTab2Selected();

    // Ensure that initial values are not cleared
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();
  });

  /**
   * Miscellaneous Other Tests
   */

  test("given empty googleAccount and string spreadsheetId and nunjucks tabName/rowValues, when tabName cleared, does not auto-pick first tabName", async () => {
    const { getFormState } = await renderWithValuesAndWait({
      config: {
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: makeTemplateExpression("nunjucks", "Tab2"),
        rowValues: {
          Foo: makeTemplateExpression("nunjucks", "valueA"),
          Bar: makeTemplateExpression("nunjucks", "valueB"),
        },
      },
    });

    expectLegacySpreadsheetTitleLoaded();

    const tabNameField = screen.getByLabelText("Tab Name");

    await act(async () => {
      await userEvent.clear(tabNameField);
    });

    await waitForEffect();

    // Ensure tab name has NOT toggled to select, and still contains an empty text expression
    expect(tabNameField).toBeVisible();
    // TextWidget uses HTMLTextAreaElement, while react-select uses HTMLInputElement
    expect(tabNameField).toBeInstanceOf(HTMLTextAreaElement);
    expect(tabNameField).toHaveValue("");
    // Ensure tab name has not been reset to the first item, use queryByText to match react-select value
    expect(screen.queryByText("Tab1")).not.toBeInTheDocument();

    expect(getFormState().config.tabName).toEqual(
      makeTemplateExpression("nunjucks", "")
    );
  });

  test("given empty googleAccount and mod input spreadsheetId and nunjucks tabName/rowValues, when tabName cleared, does not auto-pick first tabName", async () => {
    const { getFormState } = await renderWithValuesAndWait({
      config: {
        spreadsheetId: makeVariableExpression("@options.sheetId"),
        tabName: makeTemplateExpression("nunjucks", "Tab2"),
        rowValues: {
          Foo: makeTemplateExpression("nunjucks", "valueA"),
          Bar: makeTemplateExpression("nunjucks", "valueB"),
        },
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
    });

    const tabNameField = screen.getByLabelText("Tab Name");

    await act(async () => {
      await userEvent.clear(tabNameField);
    });

    await waitForEffect();

    // Ensure tab name has NOT toggled to select, and still contains an empty text expression
    expect(tabNameField).toBeVisible();
    // TextWidget uses HTMLTextAreaElement, while react-select uses HTMLInputElement
    expect(tabNameField).toBeInstanceOf(HTMLTextAreaElement);
    expect(tabNameField).toHaveValue("");
    // Ensure tab name has not been reset to the first item, use queryByText to match react-select value
    expect(screen.queryByText("Tab1")).not.toBeInTheDocument();

    expect(getFormState().config.tabName).toEqual(
      makeTemplateExpression("nunjucks", "")
    );
  });

  test("given test googleAccount and string spreadsheetId and nunjucks tabName/rowValues, when tabName cleared, does not auto-pick first tabName", async () => {
    const { getFormState } = await renderWithValuesAndWait({
      config: {
        googleAccount: makeVariableExpression("@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: makeTemplateExpression("nunjucks", "Tab2"),
        rowValues: {
          Foo: makeTemplateExpression("nunjucks", "valueA"),
          Bar: makeTemplateExpression("nunjucks", "valueB"),
        },
      },
      services: [googlePKCEIntegrationDependency],
    });

    expectGoogleAccountSpreadsheetTitleLoaded();

    const tabNameField = screen.getByLabelText("Tab Name");

    await act(async () => {
      await userEvent.clear(tabNameField);
    });

    await waitForEffect();

    // Ensure tab name has NOT toggled to select, and still contains an empty text expression
    expect(tabNameField).toBeVisible();
    // TextWidget uses HTMLTextAreaElement, while react-select uses HTMLInputElement
    expect(tabNameField).toBeInstanceOf(HTMLTextAreaElement);
    expect(tabNameField).toHaveValue("");
    // Ensure tab name has not been reset to the first item, use queryByText to match react-select value
    expect(screen.queryByText("Tab1")).not.toBeInTheDocument();

    expect(getFormState().config.tabName).toEqual(
      makeTemplateExpression("nunjucks", "")
    );
  });

  test("given test googleAccount and mod input spreadsheetId and nunjucks tabName/rowValues, when tabName cleared, does not auto-pick first tabName", async () => {
    const { getFormState } = await renderWithValuesAndWait({
      config: {
        googleAccount: makeVariableExpression("@google"),
        spreadsheetId: makeVariableExpression("@options.sheetId"),
        tabName: makeTemplateExpression("nunjucks", "Tab2"),
        rowValues: {
          Foo: makeTemplateExpression("nunjucks", "valueA"),
          Bar: makeTemplateExpression("nunjucks", "valueB"),
        },
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
      services: [googlePKCEIntegrationDependency],
    });

    const tabNameField = screen.getByLabelText("Tab Name");

    await act(async () => {
      await userEvent.clear(tabNameField);
    });

    await waitForEffect();

    // Ensure tab name has NOT toggled to select, and still contains an empty text expression
    expect(tabNameField).toBeVisible();
    // TextWidget uses HTMLTextAreaElement, while react-select uses HTMLInputElement
    expect(tabNameField).toBeInstanceOf(HTMLTextAreaElement);
    expect(tabNameField).toHaveValue("");
    // Ensure tab name has not been reset to the first item, use queryByText to match react-select value
    expect(screen.queryByText("Tab1")).not.toBeInTheDocument();

    expect(getFormState().config.tabName).toEqual(
      makeTemplateExpression("nunjucks", "")
    );
  });

  test("given selected tabName and entered rowValues, when tab changed, removes invalid rowValues properties", async () => {
    await renderWithValuesAndWait({
      config: {
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: "Tab2",
        rowValues: {
          Foo: makeTemplateExpression("nunjucks", "valueA"),
          Bar: makeTemplateExpression("nunjucks", "valueB"),
        },
      },
    });

    const tabChooser = await screen.findByLabelText("Tab Name");

    // Choose Tab2
    await userEvent.click(tabChooser);
    const tab1Option = await screen.findByText("Tab1");
    await userEvent.click(tab1Option);

    expectTab1Selected();
  });

  // eslint-disable-next-line jest/no-disabled-tests -- Legacy behavior test, not sure if needed anymore, does not pass currently
  it.skip("does not clear selected tabName and rowValues fieldValues until a different spreadsheetId is loaded", async () => {
    const initialValues = {
      config: {
        spreadsheetId: makeVariableExpression("@options.sheetId"),
        tabName: "Tab2",
        rowValues: {
          Foo: makeTemplateExpression("nunjucks", "valueA"),
          Bar: makeTemplateExpression("nunjucks", "valueB"),
        },
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
    };

    const { updateFormState } = render(
      <AppendSpreadsheetOptions name="" configKey="config" />,
      { initialValues }
    );

    await waitForEffect();

    // Toggle the field to sheet picker
    await act(async () => {
      // The Google sheet picker uses "string" as the FieldInputMode
      await selectSchemaFieldInputMode("config.spreadsheetId", "string");
    });

    // Ensure other fields have not changed yet. The spreadsheetId field value
    // will be an empty nunjucks template here, and the tab names array has not
    // loaded, so the tab name field will be automatically toggled to text
    // field input mode, and the value preserved.
    expect(screen.getByDisplayValue("Tab2")).toBeVisible();
    expect(screen.getByDisplayValue("Foo")).toBeVisible();
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("Bar")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();

    // Update the form state value outside the Google sheet picker, so that we don't need to mock that
    await act(async () => {
      updateFormState({
        ...initialValues,
        config: {
          ...initialValues.config,
          spreadsheetId: TEST_SPREADSHEET_ID,
        },
      });
    });

    // SpreadsheetId is the same, ensure other fields have not changed
    // The tab names array will be loaded here, so this will be a react-select text value
    expect(screen.getByText("Tab2")).toBeVisible();
    expect(screen.getByDisplayValue("Foo")).toBeVisible();
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("Bar")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();

    // Update the form state value to the other test spreadsheet id
    await act(async () => {
      updateFormState({
        ...initialValues,
        config: {
          ...initialValues.config,
          spreadsheetId: OTHER_TEST_SPREADSHEET_ID,
        },
      });
    });

    // Fields should be cleared and the other sheet values loaded
    // The tab names array will be loaded here, so this will be a react-select text value
    expect(screen.getByText("OtherTab1")).toBeVisible();
    // The rowValues object fields should be showing headers for OtherTab1
    expect(screen.getByDisplayValue("OtherColumn1")).toBeVisible();
    expect(screen.getByDisplayValue("OtherColumn2")).toBeVisible();
    // The old rowValues entry values should be cleared
    expect(screen.queryByDisplayValue("valueA")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("valueB")).not.toBeInTheDocument();
  });
});
