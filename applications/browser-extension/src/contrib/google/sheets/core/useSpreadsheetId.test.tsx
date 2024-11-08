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

import { renderHook } from "../../../../sidebar/testHelpers";
import useSpreadsheetId from "./useSpreadsheetId";
import { integrationConfigLocator } from "@/background/messenger/api";
import { validateRegistryId } from "../../../../types/helpers";
import { uuidSequence } from "../../../../testUtils/factories/stringFactories";
import {
  integrationDependencyFactory,
  sanitizedIntegrationConfigFactory,
} from "../../../../testUtils/factories/integrationFactories";
import IntegrationsSliceModIntegrationsContextAdapter from "../../../../integrations/store/IntegrationsSliceModIntegrationsContextAdapter";
import { validateOutputKey } from "../../../../runtime/runtimeTypes";
import { toExpression } from "../../../../utils/expressionUtils";

const TEST_SPREADSHEET_ID = uuidSequence(1);
const GOOGLE_SHEET_SERVICE_ID = validateRegistryId("google/sheet");

const findSanitizedIntegrationConfigMock = jest.mocked(
  integrationConfigLocator.findSanitizedIntegrationConfig,
);

describe("useSpreadsheetId", () => {
  beforeAll(() => {
    findSanitizedIntegrationConfigMock.mockResolvedValue(
      sanitizedIntegrationConfigFactory({
        serviceId: GOOGLE_SHEET_SERVICE_ID,
        // @ts-expect-error -- The type here is a record with a _brand field, so casting doesn't work
        config: {
          spreadsheetId: TEST_SPREADSHEET_ID,
        },
      }),
    );
  });

  test("works with string value", async () => {
    const { result, waitForEffect } = renderHook(() => useSpreadsheetId(""), {
      initialValues: {
        spreadsheetId: TEST_SPREADSHEET_ID,
      },
    });
    await waitForEffect();
    expect(result.current.data).toEqual(TEST_SPREADSHEET_ID);
  });

  test("works with service value", async () => {
    const { result, waitForEffect } = renderHook(() => useSpreadsheetId(""), {
      initialValues: {
        spreadsheetId: toExpression("var", "@google"),
        integrationDependencies: [
          integrationDependencyFactory({
            integrationId: GOOGLE_SHEET_SERVICE_ID,
            outputKey: validateOutputKey("google"),
            configId: uuidSequence,
          }),
        ],
      },
      wrapper: IntegrationsSliceModIntegrationsContextAdapter,
    });

    await waitForEffect();

    expect(result.current.data).toBe(TEST_SPREADSHEET_ID);
  });

  test("works with legacy service usage", async () => {
    const { result, waitForEffect } = renderHook(() => useSpreadsheetId(""), {
      initialValues: {
        spreadsheetId: toExpression("var", "@sheet.spreadsheetId"),
        integrationDependencies: [
          integrationDependencyFactory({
            integrationId: GOOGLE_SHEET_SERVICE_ID,
            outputKey: validateOutputKey("sheet"),
            configId: uuidSequence,
          }),
        ],
      },
      wrapper: IntegrationsSliceModIntegrationsContextAdapter,
    });

    await waitForEffect();

    expect(result.current.data).toBe(TEST_SPREADSHEET_ID);
  });

  test("works with mod input", async () => {
    const { result, waitForEffect } = renderHook(() => useSpreadsheetId(""), {
      initialValues: {
        spreadsheetId: toExpression("var", "@options.sheetId"),
        optionsArgs: {
          sheetId: TEST_SPREADSHEET_ID,
        },
      },
    });

    await waitForEffect();

    expect(result.current.data).toBe(TEST_SPREADSHEET_ID);
  });

  test("returns null when options value doesn't exist", async () => {
    const { result, waitForEffect } = renderHook(() => useSpreadsheetId(""), {
      initialValues: {
        spreadsheetId: toExpression("var", "@options.sheetId"),
        optionsArgs: {
          notASheetId: "abc",
          anotherInput: "foo",
        },
      },
    });

    await waitForEffect();

    expect(result.current.data).toBeNull();
  });

  test("returns null with no services and variable field value", async () => {
    const { result, waitForEffect } = renderHook(() => useSpreadsheetId(""), {
      initialValues: {
        spreadsheetId: toExpression("var", "@data.sheetId"),
      },
    });

    await waitForEffect();

    expect(result.current.data).toBeNull();
  });
});
