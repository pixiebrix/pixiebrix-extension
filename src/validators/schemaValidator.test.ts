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

import {
  validateBrickInputOutput,
  validatePackageDefinition,
} from "@/validators/schemaValidator";
import { loadBrickYaml } from "@/runtime/brickYaml";
import serviceText from "@contrib/raw/hunter.txt";
import { type Schema } from "@/types/schemaTypes";
import { uuidv4 } from "@/types/helpers";
import { timestampFactory } from "@/testUtils/factories/stringFactories";
import { sharingDefinitionFactory } from "@/testUtils/factories/registryFactories";

describe("validateKind", () => {
  test("can validate integration definition", async () => {
    const json = loadBrickYaml(serviceText) as UnknownObject;
    const result = validatePackageDefinition("service", json);
    expect(result.errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  test("can validate integration with timestamp/sharing metadata", async () => {
    const json = loadBrickYaml(serviceText) as UnknownObject;

    json.updated_at = timestampFactory();
    json.sharing = sharingDefinitionFactory();

    const result = validatePackageDefinition("service", json);

    expect(result.errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });

  test("fails on additional unknown property", async () => {
    const json = loadBrickYaml(serviceText) as UnknownObject;
    json.foobar = "Hello, world!";
    const result = validatePackageDefinition("service", json);

    expect(result.errors).toStrictEqual([
      {
        error: 'Property "foobar" does not match additional properties schema.',
        instanceLocation: "#",
        keyword: "additionalProperties",
        keywordLocation: "#/additionalProperties",
      },
      // The exact error here doesn't really matter:
      {
        error: "False boolean schema.",
        instanceLocation: "#/foobar",
        keyword: "false",
        keywordLocation: "#/foobar",
      },
    ]);

    expect(result.valid).toBe(false);
  });
});

describe("validateBrickInputOutput", () => {
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

    const result = await validateBrickInputOutput(inputSchema, inputInstance);
    expect(result.errors).toHaveLength(0);
    expect(result.valid).toBe(true);
  });
});
