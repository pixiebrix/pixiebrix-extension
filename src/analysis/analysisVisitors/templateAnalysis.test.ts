/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import { BlockPosition } from "@/blocks/types";
import { toExpression } from "@/testUtils/testHelpers";
import TemplateAnalysis from "./templateAnalysis";

const position: BlockPosition = {
  path: "test.path.property",
};

describe("TemplateAnalysis", () => {
  const validNunjucksTemplates = [
    "{{ username }}",
    "{{ foo.bar }}",
    '{{ foo["bar"] }}',
    '{{ foo | replace("foo", "bar") | capitalize }}',
  ];
  test.each(validNunjucksTemplates)(
    "accepts valid nunjucks [%s]",
    (template) => {
      const analysis = new TemplateAnalysis();
      analysis.visitExpression(position, toExpression("nunjucks", template));

      expect(analysis.getAnnotations()).toHaveLength(0);
    }
  );

  const mustacheOnlyTemplates = [
    "{{{name}}}",
    "a mustache {{#foo}} conditional {{/foo}}",
  ];
  test.each(mustacheOnlyTemplates)(
    "accepts valid mustache [%s]",
    (template) => {
      const analysis = new TemplateAnalysis();
      analysis.visitExpression(position, toExpression("mustache", template));

      expect(analysis.getAnnotations()).toHaveLength(0);
    }
  );

  test.each(mustacheOnlyTemplates)(
    "rejects mustache template in non-mustache expression [%s]",
    (template) => {
      const analysis = new TemplateAnalysis();
      analysis.visitExpression(position, toExpression("nunjucks", template));

      expect(analysis.getAnnotations()).toHaveLength(1);
    }
  );

  const invalidNunjucksTemplates = ["{{ foo", "{{ foo | capitalize | }}"];

  test.each(invalidNunjucksTemplates)(
    "rejects invalid nunjucks [%s]",
    (template) => {
      const analysis = new TemplateAnalysis();
      analysis.visitExpression(position, toExpression("nunjucks", template));
      expect(analysis.getAnnotations()).toHaveLength(1);
    }
  );
});
