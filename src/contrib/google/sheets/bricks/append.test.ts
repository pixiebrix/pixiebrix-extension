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

import {
  checkForBlankIntermediateColumns,
  detectShape,
  Entry,
  GoogleSheetsAppend,
  normalizeShape,
  RowValues,
  Shape,
} from "@/contrib/google/sheets/bricks/append";
import { sheets } from "@/background/messenger/api";
import { sanitizedIntegrationConfigFactory } from "@/testUtils/factories/integrationFactories";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { BrickArgs, BrickOptions } from "@/types/runtimeTypes";
import type { SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import type { Spreadsheet } from "@/contrib/google/sheets/core/types";
import { produce } from "immer";

describe("Infer shape", () => {
  it("Infer entries shape", () => {
    expect(detectShape([{ header: "Foo", value: "bar" }])).toBe("entries");
  });

  it("Infer multi shape for additional properties", () => {
    expect(detectShape([{ header: "Foo", value: "bar", other: "42" }])).toBe(
      "multi",
    );
  });

  it("Infer multi shape", () => {
    expect(detectShape([{ "column A": "Foo" }, { "column A": "Foo" }])).toBe(
      "multi",
    );
  });

  it("Infer single shape", () => {
    expect(detectShape({ "column A": "Foo", "column B": "Bar" })).toBe(
      "single",
    );
  });
});

describe("Normalize shape", () => {
  it("Normalize single shape", () => {
    expect(
      normalizeShape("infer", { "column A": "Foo", "column B": "Bar" }),
    ).toStrictEqual([
      [
        { header: "column A", value: "Foo" },
        { header: "column B", value: "Bar" },
      ],
    ]);
  });

  it("Normalize entries shape", () => {
    expect(
      normalizeShape("infer", [{ header: "Foo", value: "bar" }]),
    ).toStrictEqual([[{ header: "Foo", value: "bar" }]]);
  });

  it("Normalize multi shape", () => {
    expect(
      normalizeShape("infer", [{ "column A": "Foo", "column B": "Bar" }]),
    ).toStrictEqual([
      [
        { header: "column A", value: "Foo" },
        { header: "column B", value: "Bar" },
      ],
    ]);
  });
});

describe("checkForBlankIntermediateColumns", () => {
  it("passes for empty headers", () => {
    expect(() => {
      checkForBlankIntermediateColumns([]);
    }).not.toThrow();
  });

  it("passes for valid headers", () => {
    expect(() => {
      checkForBlankIntermediateColumns(["foo", "bar"]);
    }).not.toThrow();
  });

  it("passes with blank starting columns", () => {
    expect(() => {
      checkForBlankIntermediateColumns(["", "foo", "bar"]);
    }).not.toThrow();
  });

  it("throws error when there is a blank header", () => {
    expect(() => {
      checkForBlankIntermediateColumns(["foo", "", "bar"]);
    }).toThrow();
  });
});

const logger = new ConsoleLogger({
  extensionId: uuidv4(),
  extensionPointId: validateRegistryId("test/test"),
});

const GOOGLE_PKCE_SERVICE_ID = validateRegistryId("google/oauth2-pkce");
const googleAccount = sanitizedIntegrationConfigFactory({
  serviceId: GOOGLE_PKCE_SERVICE_ID,
});
const TEST_SPREADSHEET_ID = uuidSequence(1);
const TEST_SPREADSHEET_NAME = "Test Spreadsheet";
const brickArgs = {
  googleAccount,
  spreadsheetId: TEST_SPREADSHEET_ID,
  tabName: "Sheet1",
  shape: "infer",
  rowValues: [
    {
      header: "header1",
      value: "value1",
    } as Entry,
    {
      header: "header2",
      value: "value2",
    } as Entry,
  ],
} as unknown as BrickArgs<{
  googleAccount?: SanitizedIntegrationConfig | undefined;
  spreadsheetId: string | SanitizedIntegrationConfig;
  tabName: string;
  shape: Shape;
  rowValues: RowValues;
}>;
const brickOptions = { logger } as unknown as BrickOptions;
const testSpreadsheet: Spreadsheet = {
  spreadsheetId: TEST_SPREADSHEET_ID,
  properties: {
    title: TEST_SPREADSHEET_NAME,
  },
  sheets: [
    {
      properties: {
        sheetId: 123,
        title: "Sheet1",
      },
    },
    {
      properties: {
        sheetId: 456,
        title: "Sheet2",
      },
    },
  ],
};

describe("append logic", () => {
  beforeAll(() => {
    jest.mocked(sheets.getSpreadsheet).mockResolvedValue(testSpreadsheet);
    jest.mocked(sheets.appendRows).mockResolvedValue({});
    jest.mocked(sheets.createTab).mockResolvedValue({});
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates sheet if it doesn't exist", async () => {
    const brick = new GoogleSheetsAppend();
    jest.mocked(sheets.getAllRows).mockResolvedValue({
      values: [
        ["header1", "header2"],
        ["foo", "bar"],
      ],
    });
    const createTabSpy = jest.spyOn(sheets, "createTab");

    await brick.run(
      produce(brickArgs, (draft) => {
        draft.tabName = "Sheet3";
      }),
      brickOptions,
    );

    expect(createTabSpy).toHaveBeenCalledWith({
      googleAccount,
      spreadsheetId: TEST_SPREADSHEET_ID,
      tabName: "Sheet3",
    });
  });

  it("throws error if headers not found in first row", async () => {
    const brick = new GoogleSheetsAppend();
    jest.mocked(sheets.getAllRows).mockResolvedValue({
      values: [
        ["", ""],
        ["header1", "header2"],
        ["value1", "value2"],
      ],
    });

    await expect(brick.run(brickArgs, brickOptions)).rejects.toThrow(
      "Header row not found. The first row of the sheet must contain header(s).",
    );
  });

  it("appends header row to empty sheet", async () => {
    const brick = new GoogleSheetsAppend();
    jest.mocked(sheets.getAllRows).mockResolvedValue({});

    const appendRowsSpy = jest.spyOn(sheets, "appendRows");

    await brick.run(brickArgs, brickOptions);

    expect(appendRowsSpy).toHaveBeenCalledWith(
      {
        googleAccount,
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: "Sheet1",
      },
      [["header1", "header2"]],
    );
  });

  it("appends row successfully", async () => {
    const brick = new GoogleSheetsAppend();
    jest.mocked(sheets.getAllRows).mockResolvedValue({
      values: [
        ["header1", "header2"],
        ["foo", "bar"],
      ],
    });

    const appendRowsSpy = jest.spyOn(sheets, "appendRows");

    await brick.run(brickArgs, brickOptions);

    expect(appendRowsSpy).toHaveBeenCalledWith(
      {
        googleAccount,
        spreadsheetId: TEST_SPREADSHEET_ID,
        tabName: "Sheet1",
      },
      [["value1", "value2"]],
    );
  });
});
