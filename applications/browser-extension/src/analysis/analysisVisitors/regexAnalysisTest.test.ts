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

import { type BrickPosition } from "../../bricks/types";
import RegexAnalysis from "./regexAnalysis";
import { validateRegistryId } from "../../types/helpers";
import { type VisitBlockExtra } from "../../bricks/PipelineVisitor";
import { toExpression } from "../../utils/expressionUtils";

const position: BrickPosition = {
  path: "test.path",
};

describe("RegexAnalysis", () => {
  test("ignore expression", () => {
    const analysis = new RegexAnalysis();
    analysis.visitBrick(
      position,
      {
        id: validateRegistryId("@pixiebrix/regex"),
        config: {
          regex: toExpression("nunjucks", "(?<foo>abc {{ @foo }}"),
        },
      },
      {} as VisitBlockExtra,
    );

    expect(analysis.getAnnotations()).toHaveLength(0);
  });

  test("validate string literal", () => {
    const analysis = new RegexAnalysis();
    analysis.visitBrick(
      position,
      {
        id: validateRegistryId("@pixiebrix/regex"),
        config: {
          regex: "(?<foo>abc",
        },
      },
      {} as VisitBlockExtra,
    );

    expect(analysis.getAnnotations()).toHaveLength(1);
  });

  test("error on invalid regex", () => {
    const analysis = new RegexAnalysis();
    analysis.visitBrick(
      position,
      {
        id: validateRegistryId("@pixiebrix/regex"),
        config: {
          regex: toExpression("nunjucks", "(?<foo>abc"),
        },
      },
      {} as VisitBlockExtra,
    );

    expect(analysis.getAnnotations()).toHaveLength(1);
    expect(analysis.getAnnotations()[0]!.message).toBe(
      "Invalid regular expression: /(?<foo>abc/: Unterminated group",
    );
  });

  test.each([
    ["^(?<foo>bar)$"],
    ["^(?<foo>bar)(?<bar>baz)$"],
    ["^(?<foo>bar)after-group"],
    ["before-group(?<foo>bar)"],
  ])("accept value pattern: %s", (pattern) => {
    const analysis = new RegexAnalysis();
    analysis.visitBrick(
      position,
      {
        id: validateRegistryId("@pixiebrix/regex"),
        config: {
          regex: toExpression("nunjucks", pattern),
        },
      },
      {} as VisitBlockExtra,
    );

    expect(analysis.getAnnotations()).toHaveLength(0);
  });
});
