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

/* eslint jest/expect-expect: ["error", { "assertFunctionNames": ["expect", "expectLegacyTestSpreadsheetLoaded", "expectTab1Selected", "expectGoogleAccountSpreadsheetTitleLoaded", "expectGoogleAccountTestSpreadsheetLoaded", "expectTabSelectWorksProperly"] }]
-- TODO: replace with native expect and it.each */

import React from "react";
import AppendSpreadsheetOptions from "./AppendSpreadsheetOptions";
import registerDefaultWidgets from "../../../../components/fields/schemaFields/widgets/registerDefaultWidgets";
import { waitForEffect } from "../../../../testUtils/testHelpers";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getToggleOptions } from "../../../../components/fields/schemaFields/getToggleOptions";
import SpreadsheetPickerWidget from "./SpreadsheetPickerWidget";
import { render } from "../../../../pageEditor/testHelpers";
import { validateRegistryId } from "../../../../types/helpers";
import {
  hasCachedAuthData,
  integrationConfigLocator,
} from "../../../../background/messenger/api";
import {
  integrationDependencyFactory,
  sanitizedIntegrationConfigFactory,
} from "../../../../testUtils/factories/integrationFactories";
import {
  type FileList,
  type Spreadsheet,
} from "../core/types";
import {
  getAllSpreadsheets,
  getHeaders,
  getSpreadsheet,
  type SpreadsheetTarget,
} from "../core/sheetsApi";
import { useAuthOptions } from "../../../../hooks/useAuthOptions";
import { valueToAsyncState } from "../../../../utils/asyncStateUtils";
import { type AuthOption } from "../../../../auth/authTypes";
import { validateOutputKey } from "../../../../runtime/runtimeTypes";
import selectEvent from "react-select-event";
import { type FormikValues } from "formik";
import IntegrationsSliceModIntegrationsContextAdapter from "../../../../integrations/store/IntegrationsSliceModIntegrationsContextAdapter";
import { toExpression } from "../../../../utils/expressionUtils";
import {
  SHEET_FIELD_REF_SCHEMA,
  SHEET_FIELD_SCHEMA,
} from "../core/schemas";
import { autoUUIDSequence } from "../../../../testUtils/factories/stringFactories";

// XXX: sheetsApi should likely be mocked at the network level, not the module level
jest.mock("../core/sheetsApi");

jest.mock("../../../../hooks/useAuthOptions");
const findSanitizedIntegrationConfigMock = jest.mocked(
  integrationConfigLocator.findSanitizedIntegrationConfig,
);
const useAuthOptionsMock = jest.mocked(useAuthOptions);
const isLoggedInMock = jest.mocked(hasCachedAuthData);
const getAllSpreadsheetsMock = jest.mocked(getAllSpreadsheets);
const getSpreadsheetMock = jest.mocked(getSpreadsheet);
const getHeadersMock = jest.mocked(getHeaders);

const TEST_SPREADSHEET_ID = autoUUIDSequence();
const OTHER_TEST_SPREADSHEET_ID = autoUUIDSequence();
const GOOGLE_SHEET_SERVICE_ID = validateRegistryId("google/sheet");
const GOOGLE_PKCE_SERVICE_ID = validateRegistryId("google/oauth2-pkce");
const GOOGLE_PKCE_AUTH_CONFIG = autoUUIDSequence();
const TEST_SPREADSHEET_AUTH_CONFIG = autoUUIDSequence();

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

const googlePKCEIntegrationDependency = integrationDependencyFactory({
  integrationId: GOOGLE_PKCE_SERVICE_ID,
  outputKey: validateOutputKey("google"),
  configId: GOOGLE_PKCE_AUTH_CONFIG,
});

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
  findSanitizedIntegrationConfigMock.mockImplementation(
    async (serviceId) => servicesLookup[serviceId]!,
  );
  useAuthOptionsMock.mockReturnValue(
    valueToAsyncState([googlePKCEAuthOption, testSpreadsheetAuthOption]),
  );
  isLoggedInMock.mockResolvedValue(true);
  getAllSpreadsheetsMock.mockResolvedValue(fileListResponse);
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

beforeEach(() => {
  getSpreadsheetMock.mockImplementation(
    async ({ spreadsheetId }: SpreadsheetTarget) =>
      spreadsheetId === TEST_SPREADSHEET_ID
        ? testSpreadsheet
        : otherTestSpreadsheet,
  );
});

describe("getToggleOptions", () => {
  // Sanity check getToggleOptions returning expected values, because that would cause problems in the snapshot tests
  // Should show toggle for both $ref and $id schemas
  it.each([SHEET_FIELD_SCHEMA, SHEET_FIELD_REF_SCHEMA])(
    "should include file picker and variable toggle options",
    async (fieldSchema) => {
      const result = getToggleOptions({
        fieldSchema,
        customToggleModes: [],
        isRequired: true,
        allowExpressions: true,
        isObjectProperty: false,
        isArrayItem: false,
      });

      expect(result).toEqual([
        // The Google File Picker
        expect.objectContaining({
          Widget: SpreadsheetPickerWidget,
          value: "string",
        }),
        // Variable
        expect.objectContaining({
          value: "var",
        }),
      ]);
    },
  );
});

function expectTab1Selected() {
  // Tab names use select widget, which renders the selected value into the DOM as text, so can use getByText
  // Tab1 will be picked automatically since it's first in the list
  expect(
    screen.getByText(testSpreadsheet.sheets![0]!.properties!.title!),
  ).toBeVisible();
  // Tab2 should not be visible
  expect(
    screen.queryByText(testSpreadsheet.sheets![1]!.properties!.title!),
  ).not.toBeInTheDocument();

  // Column headers are readonly input values; need to use getByDisplayValue
  // Headers for Tab1 should be loaded into rowValues
  expect(screen.getByDisplayValue("Column1")).toBeVisible();
  expect(screen.getByDisplayValue("Column2")).toBeVisible();
  // Headers for Tab2 should not be visible
  expect(screen.queryByDisplayValue("Foo")).not.toBeInTheDocument();
  expect(screen.queryByDisplayValue("Bar")).not.toBeInTheDocument();
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

function expectTab2SelectedAndHeadersLoaded() {
  // Tab2 should be selected
  expect(
    screen.getByText(testSpreadsheet.sheets![1]!.properties!.title!),
  ).toBeVisible();
  // Tab1 should not be visible
  expect(
    screen.queryByText(testSpreadsheet.sheets![0]!.properties!.title!),
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

  expectTab2SelectedAndHeadersLoaded();
}

const renderWithValuesAndWait = async (initialValues: FormikValues) => {
  const utils = render(
    <AppendSpreadsheetOptions name="" configKey="config" />,
    {
      initialValues,
      wrapper: IntegrationsSliceModIntegrationsContextAdapter,
    },
  );

  await waitForEffect();

  return utils;
};

describe("AppendSpreadsheetOptions", () => {
  /**
   * Basic Render Tests
   */

  test("given empty googleAccount and string spreadsheetId and selected tabName and entered rowValues, when rendered, does not clear values", async () => {
    getSpreadsheetMock.mockRejectedValue(new Error("Test error"));

    await renderWithValuesAndWait({
      config: {
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: "Tab2",
        rowValues: {
          Foo: toExpression("nunjucks", "fooValue"),
          Bar: toExpression("nunjucks", "barValue"),
        },
      },
    });

    // Expect all values to be visible
    expect(screen.getByText(TEST_SPREADSHEET_ID)).toBeVisible();
    expect(screen.getByText("Tab2")).toBeVisible();
    expect(screen.getByDisplayValue("fooValue")).toBeVisible();
    expect(screen.getByDisplayValue("barValue")).toBeVisible();
  });

  test("given test googleAccount and string spreadsheetId value and selected tabName and column values, when rendered, loads spreadsheet title and doesn't clear values", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: "Tab2",
        rowValues: {
          Foo: "fooValue",
          Bar: "barValue",
        },
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    expectGoogleAccountSpreadsheetTitleLoaded();
    expectTab2SelectedAndHeadersLoaded();
  });

  test("given empty googleAccount/tabName/rowValues and string spreadsheetId, when rendered, shows spreadsheet Id", async () => {
    getSpreadsheetMock.mockRejectedValue(new Error("Test error"));

    await renderWithValuesAndWait({
      config: {
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: null,
        rowValues: {},
      },
    });

    // Spreadsheet ID should be shown when call fails to load
    expect(screen.getByText(TEST_SPREADSHEET_ID)).toBeVisible();
  });

  test("given test googleAccount and null tabName, when spreadsheet selected, loads spreadsheet/tabName/headers", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: null,
        tabName: null,
        rowValues: {},
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
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
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: null,
        rowValues: {},
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    expectGoogleAccountTestSpreadsheetLoaded();
  });

  test("given test googleAccount/rowValues and null tabName and mod input spreadsheetId, when rendered, loads tabName/headers", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: toExpression("var", "@options.sheetId"),
        tabName: null,
        rowValues: {},
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    // Mod input var field won't render title
    expectTab1Selected();
  });

  test("given test googleAccount and string spreadsheetId and var tabName, when rendered, allows any rowValues fields", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: toExpression("var", "@mySheetTab"),
        rowValues: {},
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
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

  test("given test googleAccount and string spreadsheetId and empty tabName/rowValues, when tabs are selected, loads headers", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: toExpression("nunjucks", ""),
        rowValues: {},
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    await expectTabSelectWorksProperly();
  });

  test("given test googleAccount and mod input spreadsheetId and empty tabName/rowValues, when tabs are selected, loads headers", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: toExpression("var", "@options.sheetId"),
        tabName: toExpression("nunjucks", ""),
        rowValues: {},
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    await expectTabSelectWorksProperly();
  });

  /**
   * Does Not Clear Initial Values
   */

  test("given test googleAccount and string spreadsheetId and selected tabName and nunjucks rowValues, when rendered, does not clear initial values", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: "Tab2",
        rowValues: {
          Foo: toExpression("nunjucks", "valueA"),
          Bar: toExpression("nunjucks", "valueB"),
        },
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    expectGoogleAccountSpreadsheetTitleLoaded();
    expectTab2SelectedAndHeadersLoaded();

    // Ensure that initial values are not cleared
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();
  });

  test("given test googleAccount and string spreadsheetId and nunjucks tabName/rowValues, when rendered, does not clear initial values", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: toExpression("nunjucks", "Tab2"),
        rowValues: {
          Foo: toExpression("nunjucks", "valueA"),
          Bar: toExpression("nunjucks", "valueB"),
        },
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    expectGoogleAccountSpreadsheetTitleLoaded();
    expectTab2SelectedAndHeadersLoaded();

    // Ensure that initial values are not cleared
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();
  });

  test("given test googleAccount and mod input spreadsheetId and nunjucks tabName/rowValues, when rendered, does not clear initial values", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: toExpression("var", "@options.sheetId"),
        tabName: toExpression("nunjucks", "Tab2"),
        rowValues: {
          Foo: toExpression("nunjucks", "valueA"),
          Bar: toExpression("nunjucks", "valueB"),
        },
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
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
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: toExpression("var", "@options.sheetId"),
        tabName: "Tab2",
        rowValues: {
          Foo: toExpression("nunjucks", "valueA"),
          Bar: toExpression("nunjucks", "valueB"),
        },
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    // Mod input var field won't render title
    expectTab2SelectedAndHeadersLoaded();

    // Ensure that initial values are not cleared
    expect(screen.getByDisplayValue("valueA")).toBeVisible();
    expect(screen.getByDisplayValue("valueB")).toBeVisible();
  });

  test("given test googleAccount, mod input spreadsheetId, selected tabName, and variable expression rowValues, when rendered, does not clear initial values", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: toExpression("var", "@options.sheetId"),
        // Tab2
        tabName: testSpreadsheet.sheets![1]!.properties!.title!,
        rowValues: toExpression("var", "@formValues"),
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    // Tab2 should be selected
    expect(
      screen.getByText(testSpreadsheet.sheets![1]!.properties!.title!),
    ).toBeVisible();
    // Tab1 should not be visible
    expect(
      screen.queryByText(testSpreadsheet.sheets![0]!.properties!.title!),
    ).not.toBeInTheDocument();

    // Ensure that the rowValues variable isn't cleared
    expect(screen.getByDisplayValue("@formValues")).toBeVisible();

    // No header names should be visible, since rowValues has a var expression instead
    expect(screen.queryByDisplayValue("Column1")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Column2")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Foo")).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue("Bar")).not.toBeInTheDocument();
  });

  /**
   * Miscellaneous Other Tests
   */

  test("given test googleAccount and string spreadsheetId and nunjucks tabName/rowValues, when tabName cleared, does not auto-pick first tabName", async () => {
    const { getFormState } = await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: toExpression("nunjucks", "Tab2"),
        rowValues: {
          Foo: toExpression("nunjucks", "valueA"),
          Bar: toExpression("nunjucks", "valueB"),
        },
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    expectGoogleAccountSpreadsheetTitleLoaded();

    const tabNameField = screen.getByLabelText("Tab Name");

    await userEvent.clear(tabNameField);

    await waitForEffect();

    // Ensure tab name has NOT toggled to select, and still contains an empty text expression
    expect(tabNameField).toBeVisible();
    // TextWidget uses HTMLTextAreaElement, while react-select uses HTMLInputElement
    expect(tabNameField).toBeInstanceOf(HTMLTextAreaElement);
    expect(tabNameField).toHaveValue("");
    // Ensure tab name has not been reset to the first item, use queryByText to match react-select value
    expect(screen.queryByText("Tab1")).not.toBeInTheDocument();

    expect(getFormState()!.config.tabName).toEqual(
      toExpression("nunjucks", ""),
    );
  });

  test("given test googleAccount and mod input spreadsheetId and nunjucks tabName/rowValues, when tabName cleared, does not auto-pick first tabName", async () => {
    const { getFormState } = await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: toExpression("var", "@options.sheetId"),
        tabName: toExpression("nunjucks", "Tab2"),
        rowValues: {
          Foo: toExpression("nunjucks", "valueA"),
          Bar: toExpression("nunjucks", "valueB"),
        },
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    const tabNameField = screen.getByLabelText("Tab Name");

    await userEvent.clear(tabNameField);

    await waitForEffect();

    // Ensure tab name has NOT toggled to select, and still contains an empty text expression
    expect(tabNameField).toBeVisible();
    // TextWidget uses HTMLTextAreaElement, while react-select uses HTMLInputElement
    expect(tabNameField).toBeInstanceOf(HTMLTextAreaElement);
    expect(tabNameField).toHaveValue("");
    // Ensure tab name has not been reset to the first item, use queryByText to match react-select value
    expect(screen.queryByText("Tab1")).not.toBeInTheDocument();

    expect(getFormState()!.config.tabName).toEqual(
      toExpression("nunjucks", ""),
    );
  });
});
