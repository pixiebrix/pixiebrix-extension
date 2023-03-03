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

import { renderHook } from "@/sidebar/testHelpers";
import useSpreadsheetId from "@/contrib/google/sheets/useSpreadsheetId";
import {
  sanitizedServiceConfigurationFactory,
  uuidSequence,
} from "@/testUtils/factories";
import { type RegistryId } from "@/core";
import { waitForEffect } from "@/testUtils/testHelpers";
import useDependency, { type Dependency } from "@/services/useDependency";

const TEST_SPREADSHEET_ID = uuidSequence(1);
const GOOGLE_SHEET_SERVICE_ID = "google/sheet" as RegistryId;

jest.mock("@/services/useDependency", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useDependencyMock = useDependency as jest.MockedFunction<
  typeof useDependency
>;

describe("useSpreadsheetId", () => {
  beforeAll(() => {
    useDependencyMock.mockReturnValue({
      // Hook only needs the config
      config: sanitizedServiceConfigurationFactory({
        serviceId: GOOGLE_SHEET_SERVICE_ID,
        // @ts-expect-error -- The type here is a record with a _brand field, so casting doesn't work
        config: {
          spreadsheetId: TEST_SPREADSHEET_ID,
        },
      }),
    } as Dependency);
  });

  test("works with string value", async () => {
    const { result } = renderHook(() => useSpreadsheetId(""), {
      initialValues: {
        spreadsheetId: TEST_SPREADSHEET_ID,
      },
    });
    expect(result.current).toBe(TEST_SPREADSHEET_ID);
  });

  test("works with service value", async () => {
    const { result } = renderHook(() => useSpreadsheetId(""), {
      initialValues: {
        spreadsheetId: {
          __type__: "var",
          __value__: GOOGLE_SHEET_SERVICE_ID,
        },
        services: [
          {
            id: GOOGLE_SHEET_SERVICE_ID,
            outputKey: "google",
            config: uuidSequence(2),
          },
        ],
      },
    });

    await waitForEffect();

    expect(result.current).toBe(TEST_SPREADSHEET_ID);
  });
});
