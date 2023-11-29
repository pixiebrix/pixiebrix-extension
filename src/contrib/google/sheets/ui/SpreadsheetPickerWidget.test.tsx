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

import { render } from "@/pageEditor/testHelpers";
import React from "react";
import SpreadsheetPickerWidget from "@/contrib/google/sheets/ui/SpreadsheetPickerWidget";
import { BASE_SHEET_SCHEMA } from "@/contrib/google/sheets/core/schemas";
import { services, sheets } from "@/background/messenger/api";
import { validateRegistryId } from "@/types/helpers";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { act, screen } from "@testing-library/react";
import { type FormikValues } from "formik";
import { dereference } from "@/validators/generic";
import { type UUID } from "@/types/stringTypes";
import {
  integrationDependencyFactory,
  sanitizedIntegrationConfigFactory,
} from "@/testUtils/factories/integrationFactories";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { type FileList } from "@/contrib/google/sheets/core/types";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import IntegrationsSliceModIntegrationsContextAdapter from "@/integrations/store/IntegrationsSliceModIntegrationsContextAdapter";
import selectEvent from "react-select-event";

const getAllSpreadsheetsMock = jest.mocked(sheets.getAllSpreadsheets);

let idSequence = 0;
function newId(): UUID {
  return uuidSequence(idSequence++);
}

const servicesLocateMock = jest.mocked(services.locate);

const TEST_SPREADSHEET_ID = newId();
const OTHER_TEST_SPREADSHEET_ID = newId();
const GOOGLE_SHEET_SERVICE_ID = validateRegistryId("google/sheet");
const GOOGLE_PKCE_SERVICE_ID = validateRegistryId("google/oauth2-pkce");
const GOOGLE_PKCE_AUTH_CONFIG = newId();

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

const googlePKCEIntegrationDependency = integrationDependencyFactory({
  integrationId: GOOGLE_PKCE_SERVICE_ID,
  outputKey: validateOutputKey("google"),
  configId: GOOGLE_PKCE_AUTH_CONFIG,
});

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

const renderWithValues = async (initialValues: FormikValues) => {
  const baseSchema = await dereference(BASE_SHEET_SCHEMA);

  // eslint-disable-next-line testing-library/no-unnecessary-act -- Need this for side effects to avoid console error
  await act(async () => {
    render(
      <SpreadsheetPickerWidget name="spreadsheetId" schema={baseSchema} />,
      {
        initialValues,
        wrapper: IntegrationsSliceModIntegrationsContextAdapter,
      },
    );
  });
};

beforeAll(() => {
  registerDefaultWidgets();
  servicesLocateMock.mockImplementation(
    async (serviceId) => servicesLookup[serviceId],
  );
  getAllSpreadsheetsMock.mockResolvedValue(fileListResponse);
});

describe("SpreadsheetPickerWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("given empty dependencies and null spreadsheetId, renders empty dropdown", async () => {
    await renderWithValues({
      spreadsheetId: null,
      integrationDependencies: [],
    });

    const selectInput = await screen.findByRole("combobox");
    expect(selectInput).toBeVisible();

    // Dropdown should not have a value selected
    expect(screen.queryByText(TEST_SPREADSHEET_NAME)).not.toBeInTheDocument();

    await act(async () => {
      selectEvent.openMenu(selectInput);
    });

    expect(await screen.findByText("No options")).toBeVisible();
  });

  test("given google pkce dependency and string spreadsheetId, renders dropdown with test spreadsheet option selected", async () => {
    await renderWithValues({
      spreadsheetId: TEST_SPREADSHEET_ID,
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    const selectInput = await screen.findByRole("combobox");
    expect(selectInput).toBeVisible();

    // Dropdown should show the test spreadsheet
    expect(screen.getByText(TEST_SPREADSHEET_NAME)).toBeVisible();
  });

  test("given google pkce dependency and string spreadsheetId, renders dropdown with all options", async () => {
    await renderWithValues({
      spreadsheetId: TEST_SPREADSHEET_ID,
      integrationDependencies: [googlePKCEIntegrationDependency],
    });

    const selectInput = await screen.findByRole("combobox");
    expect(selectInput).toBeVisible();

    selectEvent.openMenu(selectInput);

    // Dropdown should show the test spreadsheet options
    expect(
      screen.getByRole("option", { name: TEST_SPREADSHEET_NAME }),
    ).toBeVisible();
    expect(
      screen.getByRole("option", { name: OTHER_TEST_SPREADSHEET_NAME }),
    ).toBeVisible();

    // Switch spreadsheets
    await act(async () => {
      await selectEvent.select(
        screen.getByRole("combobox"),
        OTHER_TEST_SPREADSHEET_NAME,
      );
    });

    // Dropdown should show the other test spreadsheet
    expect(screen.queryByText(TEST_SPREADSHEET_NAME)).not.toBeInTheDocument();
    expect(screen.getByText(OTHER_TEST_SPREADSHEET_NAME)).toBeVisible();
  });
});
