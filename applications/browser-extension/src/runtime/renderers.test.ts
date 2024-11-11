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

import { engineRenderer } from "@/runtime/renderers";

describe("renderers", () => {
  describe("mustache", () => {
    const mustache = engineRenderer("mustache", {})!;

    it.each([null, undefined])("returns blank for: %s", async (value) => {
      await expect(mustache(value, {})).resolves.toBe("");
    });
  });

  describe("nunjucks", () => {
    const nunjucks = engineRenderer("nunjucks", {})!;

    it.each([null, undefined])("returns blank for: %s", async (value) => {
      await expect(nunjucks(value, {})).resolves.toBe("");
    });
  });

  describe("handlebars", () => {
    const handlebars = engineRenderer("handlebars", {})!;

    it.each([null, undefined])("returns blank for: %s", async (value) => {
      await expect(handlebars(value, {})).resolves.toBe("");
    });
  });

  describe("var", () => {
    const varExpr = engineRenderer("var", {})!;

    it.each([null, undefined])(
      "passes through value for: %s",
      async (value) => {
        await expect(varExpr(value, {})).resolves.toBe(value);
      },
    );
  });
});
