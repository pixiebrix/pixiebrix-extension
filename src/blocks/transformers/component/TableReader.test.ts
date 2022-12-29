/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { TableReader } from "@/blocks/transformers/component/TableReader";
import blockRegistry from "@/blocks/registry";
import { type BlockConfig } from "@/blocks/types";
import {
  unsafeAssumeValidArg,
  validateOutputKey,
} from "@/runtime/runtimeTypes";

jest.mock("@/telemetry/logging", () => {
  const actual = jest.requireActual("@/telemetry/logging");
  return {
    ...actual,
    getLoggingConfig: jest.fn().mockResolvedValue({
      logValues: true,
    }),
  };
});

const tableReaderBlock = new TableReader();

beforeEach(() => {
  blockRegistry.clear();
  blockRegistry.register(tableReaderBlock);
});

describe("TableReader", () => {
  test("isRootAware", async () => {
    await expect(tableReaderBlock.isRootAware()).resolves.toBe(true);
  });

  test("runs successfully", async () => {
    const blockConfig: BlockConfig = {
      id: tableReaderBlock.id,
      config: {
        orientation: "infer",
        selector: "#myTable",
      },
      outputKey: validateOutputKey("table"),
    };
    const root = document.createElement("div");
    root.innerHTML = `
      <table id="myTable">
        <tr><th>Name</th><th>Age</th></tr>
        <tr><td>Pete</td><td>25</td></tr>
        <tr><td>Steve</td><td>28</td></tr>
      </table>
    `;

    const expected = {
      fieldNames: ["Name", "Age"],
      records: [
        { Name: "Pete", Age: "25" },
        { Name: "Steve", Age: "28" },
      ],
    };

    const result = await tableReaderBlock.run(
      unsafeAssumeValidArg(blockConfig.config),
      { root } as any
    );

    expect(result).toStrictEqual(expected);
  });

  test("throws an error when selector doesn't match a table/list", async () => {
    const blockConfig: BlockConfig = {
      id: tableReaderBlock.id,
      config: {
        orientation: "infer",
        selector: "th:nth-of-type(1)",
      },
      outputKey: validateOutputKey("table"),
    };
    const root = document.createElement("div");
    root.innerHTML = `
      <table id="myTable">
        <tr><th>Name</th><th>Age</th></tr>
        <tr><td>Pete</td><td>25</td></tr>
        <tr><td>Steve</td><td>28</td></tr>
      </table>
    `;

    const getResult = async () =>
      tableReaderBlock.run(unsafeAssumeValidArg(blockConfig.config), {
        root,
      } as any);

    await expect(getResult).rejects.toThrow(TypeError);
  });

  test("selector is optional", async () => {
    const blockConfig: BlockConfig = {
      id: tableReaderBlock.id,
      config: {},
      outputKey: validateOutputKey("table"),
    };
    document.body.innerHTML = `
      <table id="myTable">
        <tr><th>Name</th><th>Age</th></tr>
        <tr><td>Pete</td><td>25</td></tr>
      </table>
    `;

    const expected = {
      fieldNames: ["Name", "Age"],
      records: [{ Name: "Pete", Age: "25" }],
    };

    const result = await tableReaderBlock.run(
      unsafeAssumeValidArg(blockConfig.config),
      { root: document.querySelector("table") } as any
    );

    expect(result).toStrictEqual(expected);
  });
});
