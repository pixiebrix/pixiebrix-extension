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

import { validateInput, validateKind } from "@/validators/generic";
import { loadBrickYaml } from "@/runtime/brickYaml";
import { type UnknownObject } from "@/types";
import serviceText from "@contrib/raw/hunter.txt";
import { type Schema } from "@/core";
import { uuidv4 } from "@/types/helpers";

describe("validateKind", () => {
  test("can validate service", async () => {
    const json = loadBrickYaml(serviceText) as UnknownObject;
    const result = await validateKind(json, "service");
    expect(result.errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });
});

describe("validateInput", () => {
  test("can validate DB ref parameter", async () => {
    const inputSchema = {
      type: "object",
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      properties: {
        db: {
          $ref: "https://app.pixiebrix.com/schemas/database#",
        },
      },
    } as Schema;
    const inputInstance = {
      db: uuidv4(),
    };

    const result = await validateInput(inputSchema, inputInstance);
    expect(result.errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });
});
