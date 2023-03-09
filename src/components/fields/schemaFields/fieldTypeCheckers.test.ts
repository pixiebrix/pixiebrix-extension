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

import { isServiceValue } from "@/components/fields/schemaFields/fieldTypeCheckers";
import {
  makeTemplateExpression,
  makeVariableExpression,
} from "@/runtime/expressionCreators";

describe("isServiceValue", () => {
  it("null is service value", () => {
    expect(isServiceValue(null)).toBe(true);
  });

  it("literal is not a service value", () => {
    expect(isServiceValue("foo")).toBe(false);
  });

  it("nunjucks is not a service value", () => {
    expect(isServiceValue(makeTemplateExpression("nunjucks", "@foo"))).toBe(
      false
    );
  });

  it("var is a service value", () => {
    expect(isServiceValue(makeVariableExpression("@foo"))).toBe(true);
  });
});
