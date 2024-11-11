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

import { mapSchemaToOptions } from "@/components/fields/schemaFields/selectFieldUtils";
import { type Schema } from "@/types/schemaTypes";

describe("selectFieldUtils", () => {
  describe("mapSchemaToOptions", () => {
    test("wrong schema type", () => {
      const schema: Schema = {
        type: "number",
        oneOf: [
          {
            const: "val1",
            title: "Title 1",
          },
        ],
      };

      const result = mapSchemaToOptions({ schema, value: "val1" });

      expect(result).toStrictEqual({
        creatable: false,
        options: [],
      });
    });

    test("standard oneOf", () => {
      const schema: Schema = {
        type: "string",
        oneOf: [
          {
            const: "val1",
            title: "Title 1",
          },
          {
            const: "val2",
            title: "Title 2",
          },
          {
            const: "val3",
            title: "Title 3",
          },
        ],
      };

      const result = mapSchemaToOptions({ schema, value: "val1" });

      expect(result).toStrictEqual({
        creatable: false,
        options: [
          {
            value: "val1",
            label: "Title 1",
          },
          {
            value: "val2",
            label: "Title 2",
          },
          {
            value: "val3",
            label: "Title 3",
          },
        ],
      });
    });

    test("creatable oneOf", () => {
      const schema: Schema = {
        type: "string",
        oneOf: [
          {
            const: "val1",
            title: "Title 1",
          },
        ],
        examples: ["test"],
      };

      const result = mapSchemaToOptions({ schema, value: "" });

      expect(result).toStrictEqual({
        creatable: true,
        options: [
          {
            value: "val1",
            label: "Title 1",
          },
        ],
      });
    });

    test("primitive", () => {
      const schema: Schema = {
        type: "string",
        enum: ["val1", "val2"],
      };

      const result = mapSchemaToOptions({ schema, value: "" });

      expect(result).toStrictEqual({
        creatable: false,
        options: [
          {
            value: "val1",
            label: "val1",
          },
          {
            value: "val2",
            label: "val2",
          },
        ],
      });
    });

    test("user options", () => {
      const schema: Schema = {
        type: "string",
        enum: ["val1"],
        examples: ["example"],
      };

      const result = mapSchemaToOptions({
        schema,
        value: "",
        created: ["created_val"],
      });

      expect(result).toStrictEqual({
        creatable: true,
        options: [
          {
            value: "created_val",
            label: "created_val",
          },
          {
            value: "example",
            label: "example",
          },
        ],
      });
    });
  });
});
