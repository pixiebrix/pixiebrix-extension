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

import { sortedFields } from "@/components/fields/schemaFields/genericOptionsFactory";
import { type Schema } from "@/core";

describe("sortedFields", () => {
  test("it sorts by type first", () => {
    expect(
      sortedFields(
        {
          aaa: {
            type: "string",
          },
          zzz: {
            $ref: "https://app.pixiebrix.com/schemas/services/serpapi/api",
          },
        } as Schema,
        {}
      ).map((x) => x.prop)
    ).toStrictEqual(["zzz", "aaa"]);
  });

  test("it sorts by database type first", () => {
    expect(
      sortedFields(
        {
          aaa: {
            type: "string",
          },
          zzz: {
            $ref: "https://app.pixiebrix.com/schemas/database#",
          },
        } as Schema,
        {}
      ).map((x) => x.prop)
    ).toStrictEqual(["zzz", "aaa"]);
  });

  test("it prefers title", () => {
    expect(
      sortedFields(
        {
          aaa: {
            type: "string",
            title: "ZZZ",
          },
          bbb: {
            type: "string",
          },
        } as Schema,
        {}
      ).map((x) => x.prop)
    ).toStrictEqual(["bbb", "aaa"]);
  });

  test("it sorts by uiSchema order", () => {
    expect(
      sortedFields(
        {
          aaa: {
            type: "string",
          },
          ccc: {
            type: "string",
          },
          bbb: {
            type: "string",
          },
        } as Schema,
        {
          "ui:order": ["bbb", "aaa"],
        }
      ).map((x) => x.prop)
    ).toStrictEqual(["bbb", "aaa", "ccc"]);
  });

  test("it sorts optional fields", () => {
    expect(
      sortedFields(
        {
          type: "object",
          required: ["ccc"],
          properties: {
            aaa: {
              type: "string",
            },
            ccc: {
              type: "string",
            },
            bbb: {
              type: "string",
              default: "foo",
            },
          },
        } as Schema,
        {}
      ).map((x) => x.prop)
    ).toStrictEqual(["bbb", "ccc", "aaa"]);
  });

  it("preserveSchemaOrder", () => {
    expect(
      sortedFields(
        {
          ccc: {
            type: "string",
          },
          aaa: {
            type: "string",
          },
        } as Schema,
        {},
        { preserveSchemaOrder: true }
      ).map((x) => x.prop)
    ).toStrictEqual(["ccc", "aaa"]);
  });
});
