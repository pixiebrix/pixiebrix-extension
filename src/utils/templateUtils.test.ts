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

import {
  castTextLiteralOrThrow,
  containsTemplateExpression,
  isTextLiteral,
} from "@/utils/templateUtils";
import { makeTemplateExpression } from "@/runtime/expressionCreators";

describe("containsTemplateExpression", () => {
  it("finds simple template expressions", () => {
    expect(containsTemplateExpression("{{foo}}")).toBe(true);
  });

  it("finds template tag", () => {
    expect(containsTemplateExpression("{% if @foo %}hello!{% endif %}")).toBe(
      true
    );
  });

  it("ignores spaces between braces", () => {
    expect(containsTemplateExpression("{ {foo }}")).toBe(false);
  });
});

describe("isTextLiteral", () => {
  it("finds typeof string", () => {
    expect(isTextLiteral("foo")).toBe(true);
  });

  it("finds template literal", () => {
    expect(isTextLiteral(makeTemplateExpression("nunjucks", "foo"))).toBe(true);
  });

  it("finds simple template expressions", () => {
    expect(isTextLiteral(makeTemplateExpression("nunjucks", "{{foo}}"))).toBe(
      false
    );
  });
});

describe("castTextLiteralOrThrow", () => {
  it("finds literal", () => {
    expect(castTextLiteralOrThrow("foo")).toBe("foo");
  });

  it("finds simple template expressions", () => {
    expect(() =>
      castTextLiteralOrThrow(makeTemplateExpression("nunjucks", "{{foo}}"))
    ).toThrow(TypeError);
  });
});
