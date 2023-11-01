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

const rule = require("./noBrowserRuntimeGetUrl");
const { RuleTester } = require("eslint");

const ruleTester = new RuleTester();
ruleTester.run("noBrowserRuntimeGetUrl", rule, {
  valid: [
    {
      code: "getExtensionConsoleUrl()",
    },
    {
      code: 'browser.runtime.getURL("background.html")',
    },
  ],
  invalid: [
    {
      code: 'var raw = browser.runtime.getURL("options.html");',
      errors: [
        {
          message:
            'Use getExtensionConsoleUrl instead of browser.runtime.getURL("options.html")',
          type: "CallExpression",
        },
      ],
    },
    {
      code: 'browser.runtime.getURL("options.html")',
      errors: [
        {
          message:
            'Use getExtensionConsoleUrl instead of browser.runtime.getURL("options.html")',
          type: "CallExpression",
        },
      ],
    },
  ],
});
