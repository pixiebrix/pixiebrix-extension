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

import { defaultBrickConfig, isOfficial } from "./util";
import { type RegistryId } from "@/types/registryTypes";
import IfElse from "./transformers/controlFlow/IfElse";
import { type Schema } from "@/types/schemaTypes";
import { EMPTY_PIPELINE } from "../utils/expressionUtils";

describe("isOfficial", () => {
  test("returns true for an official block", () => {
    expect(isOfficial("@pixiebrix/api" as RegistryId)).toBeTruthy();
  });
  test("returns false for a 3d-party block", () => {
    expect(isOfficial("@non/pixiebrix" as RegistryId)).toBeFalsy();
  });
});

describe("defaultBlockConfig", () => {
  test("initialize pipeline props", () => {
    const ifElse = new IfElse();
    const actual = defaultBrickConfig(ifElse.inputSchema);

    expect(actual.if).toEqual(EMPTY_PIPELINE);
    expect(actual.else).toEqual(EMPTY_PIPELINE);
  });

  test("handles explicit default value of false", () => {
    const schema = {
      $schema: "https://json-schema.org/draft/2019-09/schema#",
      type: "object",
      properties: {
        myProp: {
          title: "My Property",
          type: "boolean",
          default: false,
        },
      },
    } as Schema;
    const config = defaultBrickConfig(schema);
    expect(config.myProp).toBe(false);
  });
});
