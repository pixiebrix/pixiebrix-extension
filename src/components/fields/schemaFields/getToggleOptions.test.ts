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

import databaseSchema from "@schemas/database.json";
import { getToggleOptions } from "./getToggleOptions";

describe("Database field", () => {
  const databaseFieldSchema = {
    $ref: databaseSchema.$id,
  };

  test("with expressions", () => {
    const options = getToggleOptions({
      fieldSchema: databaseFieldSchema,
      isRequired: true,
      allowExpressions: true,
      customToggleModes: [],
      isObjectProperty: false,
      isArrayItem: false,
    });

    expect(options).toHaveLength(2);
    expect(options[0].label).toBe("Database");
    expect(options[1].label).toBe("Variable");
  });

  test("without expressions", () => {
    const options = getToggleOptions({
      fieldSchema: databaseFieldSchema,
      isRequired: true,
      allowExpressions: false,
      customToggleModes: [],
      isObjectProperty: false,
      isArrayItem: false,
    });

    expect(options).toHaveLength(1);
    expect(options[0].label).toBe("Database");
  });

  test("optional", () => {
    const options = getToggleOptions({
      fieldSchema: databaseFieldSchema,
      isRequired: false,
      allowExpressions: true,
      customToggleModes: [],
      isObjectProperty: false,
      isArrayItem: false,
    });

    expect(options).toHaveLength(3);
    expect(options[0].label).toBe("Database");
    expect(options[1].label).toBe("Variable");
    expect(options[2].label).toBe("Exclude");
  });
});
