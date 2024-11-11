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
  isSelectField,
  isIntegrationDependencyValueFormat,
} from "@/components/fields/schemaFields/fieldTypeCheckers";
import { toExpression } from "@/utils/expressionUtils";

describe("isServiceValue", () => {
  it("null is service value", () => {
    expect(isIntegrationDependencyValueFormat(null)).toBe(true);
  });

  it("literal is not a service value", () => {
    expect(isIntegrationDependencyValueFormat("foo")).toBe(false);
  });

  it("nunjucks is not a service value", () => {
    expect(
      isIntegrationDependencyValueFormat(toExpression("nunjucks", "@foo")),
    ).toBe(false);
  });

  it("var is a service value", () => {
    expect(
      isIntegrationDependencyValueFormat(toExpression("var", "@foo")),
    ).toBe(true);
  });
});

describe("isSelectField", () => {
  it("supports examples", () => {
    expect(isSelectField({ type: "string", examples: ["foo", "bar"] })).toBe(
      true,
    );
  });

  it("supports enum", () => {
    expect(isSelectField({ type: "string", enum: ["foo", "bar"] })).toBe(true);
  });

  it("support oneOf const", () => {
    expect(
      isSelectField({
        type: "string",
        oneOf: [{ const: "foo", title: "Foo" }],
      }),
    ).toBe(true);
  });

  it("requires string type", () => {
    // Our select widget only supports strings currently
    expect(isSelectField({ type: "number", examples: [1, 2] })).toBe(false);
  });
});
