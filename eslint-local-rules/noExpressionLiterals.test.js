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

const noExpressionLiterals = require("./noExpressionLiterals");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester();

ruleTester.run("noExpressionLiterals", noExpressionLiterals, {
  valid: [
    { code: "{ foo: 42 }" },
    { code: "var x = { __type__: 'nunjucks', bar: 32 };" },
  ],
  invalid: [
    {
      code: 'var x = { __type__: "nunjucks", __value__: "Hello!" }',
      errors: [
        {
          message:
            'Use makeTemplateExpression("nunjucks", value) instead of an object literal',
        },
      ],
      output: 'var x = makeTemplateExpression("nunjucks", "Hello!")',
    },
    {
      code: 'var x = { __type__: "mustache", __value__: "Hello!" }',
      errors: [
        {
          message:
            'Use makeTemplateExpression("mustache", value) instead of an object literal',
        },
      ],
      output: 'var x = makeTemplateExpression("mustache", "Hello!")',
    },
    {
      code: 'var x = { __type__: "var", __value__: "@foo" }',
      errors: [
        {
          message:
            "Use makeVariableExpression(value) instead of an object literal",
        },
      ],
      output: 'var x = makeVariableExpression("@foo")',
    },
  ],
});
