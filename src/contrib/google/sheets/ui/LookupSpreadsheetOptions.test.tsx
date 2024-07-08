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
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { waitForEffect } from "@/testUtils/testHelpers";
import LookupSpreadsheetOptions from "@/contrib/google/sheets/ui/LookupSpreadsheetOptions";
import { act, screen } from "@testing-library/react";
import { validateRegistryId } from "@/types/helpers";
import selectEvent from "react-select-event";
import { render } from "@/pageEditor/testHelpers";
import {
  integrationConfigLocator,
  hasCachedAuthData,
} from "@/background/messenger/api";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";
import {
  integrationDependencyFactory,
  sanitizedIntegrationConfigFactory,
} from "@/testUtils/factories/integrationFactories";
import {
  type FileList,
  type Spreadsheet,
} from "@/contrib/google/sheets/core/types";
import { useAuthOptions } from "@/hooks/auth";
import { type AuthOption } from "@/auth/authTypes";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { valueToAsyncState } from "@/utils/asyncStateUtils";
import { type FormikValues } from "formik";
import IntegrationsSliceModIntegrationsContextAdapter from "@/integrations/store/IntegrationsSliceModIntegrationsContextAdapter";
import { toExpression } from "@/utils/expressionUtils";
import {
  getAllSpreadsheets,
  getHeaders,
  getSpreadsheet,
} from "@/contrib/google/sheets/core/sheetsApi";

const findSanitizedIntegrationConfigMock = jest.mocked(
  integrationConfigLocator.findSanitizedIntegrationConfig,
);

// XXX: sheetsApi should likely be mocked at the network level, not the module level
jest.mock("@/contrib/google/sheets/core/sheetsApi");
jest.mock("@/hooks/auth");

const useAuthOptionsMock = jest.mocked(useAuthOptions);

const isLoggedInMock = jest.mocked(hasCachedAuthData);
const getAllSpreadsheetsMock = jest.mocked(getAllSpreadsheets);
const getSpreadsheetMock = jest.mocked(getSpreadsheet);
const getHeadersMock = jest.mocked(getHeaders);

const TEST_SPREADSHEET_ID = autoUUIDSequence();
const GOOGLE_SHEET_SERVICE_ID = validateRegistryId("google/sheet");
const GOOGLE_PKCE_SERVICE_ID = validateRegistryId("google/oauth2-pkce");
const GOOGLE_PKCE_AUTH_CONFIG = autoUUIDSequence();
const TEST_SPREADSHEET_AUTH_CONFIG = autoUUIDSequence();

const TEST_SPREADSHEET_NAME = "Test Spreadsheet";

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

const GOOGLE_AUTH_OPTION_LABEL = "Google OAuth2 PKCE";

const googlePKCEAuthOption: AuthOption = {
  serviceId: GOOGLE_PKCE_SERVICE_ID,
  label: GOOGLE_AUTH_OPTION_LABEL,
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
  ],
};

async function expectTabsAndHeadersToBeLoaded() {
  const tabChooser = await screen.findByLabelText("Tab Name");
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
}

beforeAll(() => {
  registerDefaultWidgets();
  findSanitizedIntegrationConfigMock.mockImplementation(
    async (serviceId) => servicesLookup[serviceId],
  );
  useAuthOptionsMock.mockReturnValue(
    valueToAsyncState([googlePKCEAuthOption, testSpreadsheetAuthOption]),
  );
  isLoggedInMock.mockResolvedValue(true);
  getAllSpreadsheetsMock.mockResolvedValue(fileListResponse);
  getSpreadsheetMock.mockResolvedValue(testSpreadsheet);
  getHeadersMock.mockImplementation(async ({ tabName }) => {
    if (tabName === "Tab1") {
      return ["Column1", "Column2"];
    }

    return ["Foo", "Bar"];
  });
});

const renderWithValuesAndWait = async (initialValues: FormikValues) => {
  const utils = render(
    <LookupSpreadsheetOptions name="" configKey="config" />,
    {
      initialValues,
      wrapper: IntegrationsSliceModIntegrationsContextAdapter,
    },
  );

  await waitForEffect();

  return utils;
};

describe("LookupSpreadsheetOptions", () => {
  test("given test googleAccount and string spreadsheetId and selected tabName/header and entered query, when rendered, does not change values", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: "Tab2",
        header: "Bar",
        query: toExpression("nunjucks", "test query"),
        multi: false,
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    // Expect values have not changed
    expect(screen.getByText(GOOGLE_AUTH_OPTION_LABEL)).toBeVisible();
    expect(screen.getByText(TEST_SPREADSHEET_NAME)).toBeVisible();
    expect(screen.getByText("Tab2")).toBeVisible();
    expect(screen.getByText("Bar")).toBeVisible();
    expect(screen.getByDisplayValue("test query")).toBeVisible();
  });

  test("given test googleAccount and string spreadsheetId, when rendered, loads tab names and header values", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: toExpression("nunjucks", ""),
        header: toExpression("nunjucks", ""),
        query: toExpression("nunjucks", ""),
        multi: false,
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    // Tab1 will be picked automatically since it's first in the list
    expect(screen.getByText("Tab1")).toBeVisible();

    await expectTabsAndHeadersToBeLoaded();
  });

  test("given test googleAccount and mod input spreadsheetId, when rendered, loads tab names and header values", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: toExpression("var", "@options.sheetId"),
        tabName: toExpression("nunjucks", ""),
        header: toExpression("nunjucks", ""),
        query: toExpression("nunjucks", ""),
        multi: false,
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    // Tab1 will be picked automatically since it's first in the list
    expect(screen.getByText("Tab1")).toBeVisible();

    await expectTabsAndHeadersToBeLoaded();
  });

  test("given test googleAccount and null spreadsheetId, when spreadsheet selected, loads tab names and header values", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: null,
        tabName: toExpression("nunjucks", ""),
        header: toExpression("nunjucks", ""),
        query: toExpression("nunjucks", ""),
        multi: false,
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

    // Tab1 will be picked automatically since it's first in the list
    expect(screen.getByText("Tab1")).toBeVisible();

    await expectTabsAndHeadersToBeLoaded();
  });

  test("given test googleAccount and mod input spreadsheetId value, when rendered, does not clear variable values", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: toExpression("var", "@options.sheetId"),
        tabName: toExpression("var", "@myTab"),
        header: toExpression("var", "@myHeader"),
        query: toExpression("var", "@query"),
        multi: false,
      },
      optionsArgs: {
        sheetId: TEST_SPREADSHEET_ID,
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    expect(screen.getByDisplayValue("@options.sheetId")).toBeVisible();
    expect(screen.getByDisplayValue("@myTab")).toBeVisible();
    expect(screen.getByDisplayValue("@myHeader")).toBeVisible();
    expect(screen.getByDisplayValue("@query")).toBeVisible();
  });

  test("given test googleAccount and string spreadsheetId value, when rendered, does not clear variable values", async () => {
    await renderWithValuesAndWait({
      config: {
        googleAccount: toExpression("var", "@google"),
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: toExpression("var", "@myTab"),
        header: toExpression("var", "@myHeader"),
        query: toExpression("var", "@query"),
        multi: false,
      },
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    // Spreadsheet ID should not be user-visible
    expect(screen.queryByText(TEST_SPREADSHEET_ID)).not.toBeInTheDocument();
    // Loaded spreadsheets use select widget, which renders the selected value into the DOM as text, so can use getByText
    expect(screen.getByText(TEST_SPREADSHEET_NAME)).toBeVisible();
    expect(screen.getByDisplayValue("@myTab")).toBeVisible();
    expect(screen.getByDisplayValue("@myHeader")).toBeVisible();
    expect(screen.getByDisplayValue("@query")).toBeVisible();
  });
});
