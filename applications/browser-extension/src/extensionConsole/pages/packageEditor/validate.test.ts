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

import { validateSchema } from "./validate";
import trelloModDefinition from "../../../../contrib/recipes/trello-slack.yaml";
import amazonBrick from "../../../../contrib/bricks/amazon-search.yaml";
import v3ModDefinition from "../../../../contrib/recipes/v3-example.txt";
import { objToYaml } from "../../../utils/objToYaml";
import v3OptionalIntegrations from "../../../../contrib/recipes/v3-optional-services-example.txt";

describe("validateSchema", () => {
  test("validates a v1 blueprint", async () => {
    await expect(
      validateSchema(objToYaml(trelloModDefinition)),
    ).resolves.toEqual({});
  });

  test("validates a v3 mod definition", async () => {
    await expect(validateSchema(v3ModDefinition)).resolves.toEqual({});
  });

  test("validates a brick", async () => {
    await expect(validateSchema(objToYaml(amazonBrick))).resolves.toEqual({});
  });

  test("validates an optional integration configuration schema", async () => {
    await expect(validateSchema(v3OptionalIntegrations)).resolves.toEqual({});
  });
});
