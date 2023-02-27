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

import { renderHook } from "@/pageEditor/testHelpers";
import useSpreadsheetId from "@/contrib/google/sheets/useSpreadsheetId";
import { uuidSequence } from "@/testUtils/factories";

const TEST_SPREADSHEET_ID = uuidSequence(1);

jest.mock("@/services/useDependency", () => ({
  __esModule: true,
  default: () => ({
    config: {
      id: "c5a2b0d2-e749-4191-8543-e52e5ef3a55a",
      serviceId: "google/sheet",
      proxy: false,
      config: {
        spreadsheetId: TEST_SPREADSHEET_ID,
      },
    },
    service: {
      id: "google/sheet",
      name: "Google Sheet",
      description: "A Google Sheet",
      _definition: {
        kind: "service",
        metadata: {
          id: "google/sheet",
          url: "https://sheets.google.com",
          name: "Google Sheet",
          version: "0.0.1",
          description: "A Google Sheet",
        },
        apiVersion: "v1",
        inputSchema: {
          type: "object",
          $schema: "https://json-schema.org/draft/2019-09/schema#",
          required: ["spreadsheetId"],
          properties: {
            spreadsheetId: {
              type: "string",
              description: "The spreadsheet id",
            },
          },
        },
        sharing: {
          public: true,
          organizations: [],
        },
        updated_at: "2022-08-17T17:35:40.779163Z",
      },
      schema: {
        type: "object",
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        required: ["spreadsheetId"],
        properties: {
          spreadsheetId: {
            type: "string",
            description: "The spreadsheet id",
          },
        },
      },
      hasAuth: false,
      version: "0.0.1",
    },
    hasPermissions: true,
  }),
}));

describe("useSpreadsheetId", () => {
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
          __value__: "google/sheet",
        },
        services: [
          {
            id: "google/sheet",
            outputKey: "google",
            config: "c5a2b0d2-e749-4191-8543-e52e5ef3a55a",
          },
        ],
      },
    });
    expect(result.current).toBe(TEST_SPREADSHEET_ID);
  });
});
