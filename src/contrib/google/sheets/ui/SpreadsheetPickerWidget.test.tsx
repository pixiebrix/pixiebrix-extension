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
import { waitForEffect } from "@/testUtils/testHelpers";
import { services, sheets } from "@/background/messenger/api";
import { makeVariableExpression } from "@/runtime/expressionCreators";
import { validateRegistryId } from "@/types/helpers";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { brickConfigFactory } from "@/testUtils/factories/brickFactories";
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
import useFlags from "@/hooks/useFlags";

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

const googlePKCEIntegrationDependency = integrationDependencyFactory({
  integrationId: GOOGLE_PKCE_SERVICE_ID,
  outputKey: validateOutputKey("google"),
  configId: GOOGLE_PKCE_AUTH_CONFIG,
});

const testSpreadsheetIntegrationDependency = integrationDependencyFactory({
  integrationId: GOOGLE_SHEET_SERVICE_ID,
  outputKey: validateOutputKey("google"),
  configId: TEST_SPREADSHEET_AUTH_CONFIG,
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

jest.mock("@/hooks/useFlags", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useFlagsMock = jest.mocked(useFlags);

const renderWithValuesAndWait = async (initialValues: FormikValues) => {
  const baseSchema = await dereference(BASE_SHEET_SCHEMA);

  const utils = render(
    <SpreadsheetPickerWidget name="spreadsheetId" schema={baseSchema} />,
    {
      initialValues,
      wrapper: IntegrationsSliceModIntegrationsContextAdapter,
    }
  );

  await waitForEffect();

  return utils;
};

beforeAll(() => {
  registerDefaultWidgets();
  servicesLocateMock.mockImplementation(
    async (serviceId) => servicesLookup[serviceId]
  );
  getAllSpreadsheetsMock.mockResolvedValue(fileListResponse);
});

describe("SpreadsheetPickerWidget", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFlagsMock.mockReturnValue({
      permit: jest.fn(),
      restrict: jest.fn(),
      flagOn(flag: string) {
        return true;
      },
      flagOff(flag: string) {
        return false;
      },
    });
  });

  it("smoke test", async () => {
    useFlagsMock.mockReturnValue({
      permit: jest.fn(),
      restrict: jest.fn(),
      flagOn(flag: string) {
        return false;
      },
      flagOff(flag: string) {
        return true;
      },
    });

    const { asFragment } = await renderWithValuesAndWait({
      spreadsheetId: null,
    });
    expect(asFragment()).toMatchSnapshot();
  });

  it("smoke test with feature flag off", async () => {
    const { asFragment } = await renderWithValuesAndWait({
      spreadsheetId: null,
    });
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders valid sheet on load", async () => {
    await renderWithValuesAndWait({ spreadsheetId: TEST_SPREADSHEET_ID });

    // Verify it's showing the sheet title and not the sheet unique id
    expect(screen.getByRole("textbox")).toHaveDisplayValue(
      TEST_SPREADSHEET_NAME
    );
  });

  it("falls back to spreadsheet id if fetching properties fails", async () => {
    await renderWithValuesAndWait({ spreadsheetId: TEST_SPREADSHEET_ID });

    expect(screen.getByRole("textbox")).toHaveDisplayValue(TEST_SPREADSHEET_ID);
  });

  it("shows workshop fallback on expression", async () => {
    await renderWithValuesAndWait({
      spreadsheetId: makeVariableExpression("@sheet"),
    });

    expect(screen.getByRole("textbox")).toHaveDisplayValue(
      "Use Workshop to edit"
    );
  });

  it("removes unused integration dependency on mount", async () => {
    const initialValues = formStateFactory(
      {
        integrationDependencies: [testSpreadsheetIntegrationDependency],
      },
      [
        brickConfigFactory({
          config: {
            spreadsheetId: TEST_SPREADSHEET_ID,
          },
        }),
      ]
    );

    const { getFormState } = await renderWithValuesAndWait(initialValues);

    expect(getFormState().integrationDependencies).toHaveLength(0);
  });

  it("does not remove used integration dependency on mount", async () => {
    const initialValues = formStateFactory(
      {
        integrationDependencies: [testSpreadsheetIntegrationDependency],
      },
      [
        brickConfigFactory({
          config: {
            spreadsheetId: makeVariableExpression("@google"),
          },
        }),
      ]
    );

    const { getFormState } = await renderWithValuesAndWait(initialValues);

    const formState = getFormState();

    expect(formState.integrationDependencies).toHaveLength(1);
    expect(formState.integrationDependencies[0]).toEqual(
      testSpreadsheetIntegrationDependency
    );
  });

  it("shows working spreadsheet dropdown picker when using test google account PKCE", async () => {
    const initialValues = formStateFactory(
      {
        integrationDependencies: [googlePKCEIntegrationDependency],
      },
      [
        brickConfigFactory({
          config: {
            spreadsheetId: makeVariableExpression("@google"),
          },
        }),
      ]
    );

    await renderWithValuesAndWait(initialValues);

    // Dropdown should show both spreadsheets
    selectEvent.openMenu(screen.getByRole("combobox"));
    expect(screen.getByText(TEST_SPREADSHEET_NAME)).toBeVisible();
    expect(screen.getByText(OTHER_TEST_SPREADSHEET_NAME)).toBeVisible();

    // Pick the first one
    await act(async () => {
      await selectEvent.select(
        screen.getByRole("combobox"),
        TEST_SPREADSHEET_NAME
      );
    });

    expect(screen.getByText(TEST_SPREADSHEET_NAME)).toBeVisible();
    expect(
      screen.queryByText(OTHER_TEST_SPREADSHEET_NAME)
    ).not.toBeInTheDocument();

    // Switch spreadsheets
    await act(async () => {
      await selectEvent.select(
        screen.getByRole("combobox"),
        OTHER_TEST_SPREADSHEET_NAME
      );
    });

    expect(screen.queryByText(TEST_SPREADSHEET_NAME)).not.toBeInTheDocument();
    expect(screen.getByText(OTHER_TEST_SPREADSHEET_NAME)).toBeVisible();
  });
});
