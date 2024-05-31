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

const noCrossBoundaryImports = require("./noCrossBoundaryImports");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester({
  parser: require.resolve("@typescript-eslint/parser"),
  parserOptions: {
    sourceType: "module",
  },
});

const options = [
  {
    boundaries: [
      "background",
      "contentScript",
      "pageEditor",
      "extensionConsole",
      "sidebar",
      "pageScript",
    ],
    allowedGlobs: ["**/messenger/**", "**/*.scss*"],
  },
];
const errors = [
  {
    message: /cannot be imported/,
    type: "ImportDeclaration",
  },
];

ruleTester.run("noCrossBoundaryImports", noCrossBoundaryImports, {
  valid: [
    {
      // In-boundary side-effect import
      code: 'import "@/background/foo";',
      filename: "src/background/bar.ts",
      options,
    },
    {
      // In-boundary single import
      code: 'import {x} from "@/background/foo";',
      filename: "src/background/bar.ts",
      options,
    },
    {
      // Cross-boundary type import
      code: 'import {type x} from "@/sidebar/foo";',
      filename: "src/background/bar.ts",
      options,
    },
    {
      // Cross-boundary default type import
      code: 'import type x from "@/sidebar/foo";',
      filename: "src/background/bar.ts",
      options,
    },
    {
      // Shared code import
      code: 'import "@/utils";',
      filename: "src/background/bar.ts",
      options,
    },
    {
      // Global dependencies import
      code: 'import "react";',
      filename: "src/background/bar.ts",
      options,
    },
    {
      // Cross-boundary allowlisted import
      code: 'import "@/background/messenger/api";',
      filename: "src/sidebar/bar.ts",
      options,
    },
    {
      // In-boundary import expression
      code: 'import("@/background/foo");',
      filename: "src/background/bar.ts",
      options,
    },
    {
      // Shared code import expression
      code: 'import("@/utils");',
      filename: "src/background/bar.ts",
      options,
    },
    {
      // eslint-disable-next-line no-template-curly-in-string -- Dynamic import expressions are ignored
      code: "import(`@/dynamic/${'import'}`);",
      filename: "src/background/bar.ts",
      options,
    },
  ],
  invalid: [
    {
      // Cross-boundary import
      code: 'import "@/background/foo";',
      filename: "src/sidebar/bar.ts",
      options,
      errors,
    },
    {
      // Cross-boundary import of at least one value
      code: 'import {type X, Y} from "@/background/foo";',
      filename: "src/sidebar/bar.ts",
      options,
      errors,
    },
    {
      // Cross-boundary import expression
      code: 'import("@/background/foo");',
      filename: "src/sidebar/bar.ts",
      options,
      errors: [
        {
          message: /cannot be imported/,
          type: "ImportExpression",
        },
      ],
    },
  ],
});
