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

import { isUnavailableMod, normalizeModOptionsDefinition } from "./modUtils";
import { type UnavailableMod } from "@/types/modTypes";
import { defaultModDefinitionFactory } from "../testUtils/factories/modDefinitionFactories";
import { type ModOptionsDefinition } from "@/types/modDefinitionTypes";
import { freeze } from "./objectUtils";

describe("isUnavailableMod", () => {
  it("returns false for a recipe definition", () => {
    const mod = defaultModDefinitionFactory();
    expect(isUnavailableMod(mod)).toBe(false);
  });

  it("returns true for UnavailableRecipe", () => {
    const mod = {
      isStub: true,
    } as UnavailableMod;
    expect(isUnavailableMod(mod)).toBe(true);
  });
});

describe("normalizeModOptionsDefinition", () => {
  it("normalizes null", () => {
    expect(normalizeModOptionsDefinition(null)).toStrictEqual({
      schema: {
        type: "object",
        properties: {},
      },
      uiSchema: {
        "ui:order": ["*"],
      },
    });
  });

  it("normalizes frozen object with no ui:order", () => {
    // Root cause of https://github.com/pixiebrix/pixiebrix-app/issues/5396
    const original = freeze({
      schema: {
        type: "object",
        properties: freeze({}),
      },
      uiSchema: freeze({}),
    }) satisfies ModOptionsDefinition;

    expect(normalizeModOptionsDefinition(original)).toStrictEqual({
      schema: {
        type: "object",
        properties: {},
      },
      uiSchema: {
        "ui:order": ["*"],
      },
    });
  });

  it("normalizes legacy schema", () => {
    expect(
      normalizeModOptionsDefinition({
        schema: {
          foo: {
            type: "string",
          },
        },
      } as any),
    ).toStrictEqual({
      schema: {
        type: "object",
        $schema: "https://json-schema.org/draft/2019-09/schema#",
        properties: {
          foo: {
            type: "string",
          },
        },
        required: ["foo"],
      },
      uiSchema: {
        "ui:order": ["foo", "*"],
      },
    });
  });
});
