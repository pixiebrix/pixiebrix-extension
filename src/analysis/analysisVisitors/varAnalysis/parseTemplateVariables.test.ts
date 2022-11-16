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

import parseTemplateVariables from "./parseTemplateVariables";

test("simple template", () => {
  const result = parseTemplateVariables(
    "a {{variableA}} {{@variableB}} template"
  );

  expect(result[0]).toBe("variableA");
  expect(result[1]).toBe("@variableB");
});

test("access with []", () => {
  const template = "Hello {{ foo['bar baz'] }}";
  const result = parseTemplateVariables(template);
  expect(result[0]).toBe("foo['bar baz']");
});

test("indexed access", () => {
  const template = "Hello {{ foo[0] }}";
  const result = parseTemplateVariables(template);
  expect(result[0]).toBe("foo[0]");
});

test("works with filters", () => {
  const template =
    'A template with a filter {{ foo | replace("foo", "bar") | capitalize }}.';
  const result = parseTemplateVariables(template);

  expect(result[0]).toBe("foo");
});
