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

import * as sheets from "@/contrib/google/sheets/core/sheetsApi";
import { GoogleSheetsLookup } from "@/contrib/google/sheets/bricks/lookup";
import { type ValueRange } from "@/contrib/google/sheets/core/types";
import { BusinessError, PropError } from "@/errors/businessErrors";
import { sanitizedIntegrationConfigFactory } from "@/testUtils/factories/integrationFactories";

// XXX: sheetsApi should likely be mocked at the network level, not the module level
jest.mock("@/contrib/google/sheets/core/sheetsApi");

const getAllRowsMock = jest.mocked(sheets.getAllRows);

describe("Google sheets lookup brick logic", () => {
  const lookupBrick = new GoogleSheetsLookup();
  type InputType = Parameters<typeof lookupBrick.transform>[0];

  async function runLookup(
    input: Record<string, any>,
  ): Promise<UnknownObject | UnknownObject[]> {
    return lookupBrick.transform(
      {
        googleAccount: sanitizedIntegrationConfigFactory(),
        spreadsheetId: "abc",
        tabName: "Sheet1",
        ...input,
      } as InputType,
      // @ts-expect-error -- lookupBrick.transform() only uses the logger
      { logger: { debug: jest.fn() } },
    );
  }

  it("throws error if query is set and filterRows is undefined and header is not found", async () => {
    const rows: ValueRange = {
      values: [
        ["ColumnFoo", "ColumnBar"],
        ["A", "1"],
        ["B", "2"],
        ["C", "3"],
      ],
    };
    getAllRowsMock.mockResolvedValue(rows);

    await expect(
      runLookup({
        header: "ColumnA",
        query: "testQuery",
        multi: false,
      }),
    ).rejects.toThrowWithMessage(BusinessError, "Header ColumnA not found");
  });

  it("throws prop error if googleAccount is not set", async () => {
    await expect(
      runLookup({
        googleAccount: undefined,
      }),
    ).rejects.toThrow(PropError);
  });

  it("throws error if query is set and filterRows is true and header is not found", async () => {
    const rows: ValueRange = {
      values: [
        ["ColumnFoo", "ColumnBar"],
        ["A", "1"],
        ["B", "2"],
        ["C", "3"],
      ],
    };
    getAllRowsMock.mockResolvedValue(rows);

    await expect(
      runLookup({
        filterRows: true,
        header: "ColumnA",
        query: "testQuery",
        multi: false,
      }),
    ).rejects.toThrowWithMessage(BusinessError, "Header ColumnA not found");
  });

  it("only returns first row when multi is false", async () => {
    const rows: ValueRange = {
      values: [
        ["ColumnFoo", "ColumnBar"],
        ["A", "1"],
        ["A", "2"],
        ["B", "3"],
      ],
    };
    getAllRowsMock.mockResolvedValue(rows);

    const result = await runLookup({
      header: "ColumnFoo",
      query: "A",
      multi: false,
    });

    expect(result).toEqual({ ColumnFoo: "A", ColumnBar: "1" });
  });

  it("returns all matches when multi is true", async () => {
    const rows: ValueRange = {
      values: [
        ["ColumnFoo", "ColumnBar"],
        ["A", "1"],
        ["A", "2"],
        ["B", "3"],
        ["C", "4"],
      ],
    };
    getAllRowsMock.mockResolvedValue(rows);

    const result = await runLookup({
      header: "ColumnFoo",
      query: "A",
      multi: true,
    });

    expect(result).toEqual([
      { ColumnFoo: "A", ColumnBar: "1" },
      { ColumnFoo: "A", ColumnBar: "2" },
    ]);
  });

  it("returns all rows when filterRows is false", async () => {
    const rows: ValueRange = {
      values: [
        ["ColumnFoo", "ColumnBar"],
        ["A", "1"],
        ["A", "2"],
        ["B", "3"],
        ["C", "4"],
      ],
    };
    getAllRowsMock.mockResolvedValue(rows);

    const result = await runLookup({
      filterRows: false,
    });

    expect(result).toEqual([
      { ColumnFoo: "A", ColumnBar: "1" },
      { ColumnFoo: "A", ColumnBar: "2" },
      { ColumnFoo: "B", ColumnBar: "3" },
      { ColumnFoo: "C", ColumnBar: "4" },
    ]);
  });

  it("returns all rows when filterRows is false even if header and query are set", async () => {
    const rows: ValueRange = {
      values: [
        ["ColumnFoo", "ColumnBar"],
        ["A", "1"],
        ["A", "2"],
        ["B", "3"],
        ["C", "4"],
      ],
    };
    getAllRowsMock.mockResolvedValue(rows);

    const result = await runLookup({
      filterRows: false,
      header: "ColumnFoo",
      query: "A",
      multi: false,
    });

    expect(result).toEqual([
      { ColumnFoo: "A", ColumnBar: "1" },
      { ColumnFoo: "A", ColumnBar: "2" },
      { ColumnFoo: "B", ColumnBar: "3" },
      { ColumnFoo: "C", ColumnBar: "4" },
    ]);
  });
});
