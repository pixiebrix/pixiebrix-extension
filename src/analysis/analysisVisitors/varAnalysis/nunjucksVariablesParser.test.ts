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

import parseTemplateVariables, {
  getVariableAtPosition,
} from "./nunjucksVariablesParser";

describe("parseTemplateVariables", () => {
  test("simple template", () => {
    const result = parseTemplateVariables(
      "a {{@variableA}} {{ @variableB }} template"
    );

    expect(result[0]).toBe("@variableA");
    expect(result[1]).toBe("@variableB");
  });

  test("access with .", () => {
    const result = parseTemplateVariables(
      "a {{@foo.bar}} {{ @foo.baz}} {{ @foo.bar.baz }} {{ @qux.quux }} template"
    );

    expect(result).toEqual([
      "@foo.bar",
      "@foo.baz",
      "@foo.bar.baz",
      "@qux.quux",
    ]);
  });

  test("access with []", () => {
    const template = "Hello {{ @foo['bar baz'] }}";
    const result = parseTemplateVariables(template);
    expect(result[0]).toBe('@foo["bar baz"]');
  });

  test("indexed access", () => {
    const template = "Hello {{ @foo[0] }}";
    const result = parseTemplateVariables(template);
    expect(result[0]).toBe("@foo.0");
  });

  test("works with filters", () => {
    const template =
      'A template with a filter {{ @foo | replace("foo", "bar") | capitalize }}.';
    const result = parseTemplateVariables(template);

    expect(result[0]).toBe("@foo");
  });

  test("outside braces", () => {
    const template = "Hello @foo";
    const result = parseTemplateVariables(template);
    expect(result).toHaveLength(0);
  });

  test("if tag", () => {
    const template = `
    {% if @hungry %}
      I am hungry
    {% elif @tired %}
      I am tired
    {% else %}
      I am good!
    {% endif %}`;
    const result = parseTemplateVariables(template);
    expect(result[0]).toBe("@hungry");
    expect(result[1]).toBe("@tired");
  });

  test("no @ prefix", () => {
    const template = "Hello {{ variable }}";
    const result = parseTemplateVariables(template);
    expect(result[0]).toBe("variable");
  });

  test("complex conditions", () => {
    const template = `
    {% if @happy and @hungry %}
      I am happy *and* hungry; both are true.
    {% endif %}`;
    const result = parseTemplateVariables(template);
    expect(result[0]).toBe("@happy");
    expect(result[1]).toBe("@hungry");
  });

  test("nunjucks for loop item", () => {
    const template = `
    {% for item in @items %}
      Item value: {{ item }}
    {% endfor %}`;
    const result = parseTemplateVariables(template);
    expect(result).toEqual(["@items"]);
  });

  test("nunjucks for loop item 2", () => {
    const template = `
    {% for qux in @foo.bar.baz %}
      Item value: {{ qux.quux.quuux }}
      Context var: {{ @corge.grault.garply}}
    {% endfor %}`;
    const result = parseTemplateVariables(template);
    expect(result).toEqual(["@foo.bar.baz", "@corge.grault.garply"]);
  });
});

describe("getVariableAtPosition", () => {
  test.each([
    [0, null], // Before the first variable
    [6, null], // Inside the braces right before the variable
    [7, "@foo"], // At the start of the variable
    [10, "@foo"], // At the end of the variable
    [11, null], // Right after the variable
    [20, null], // On the braces before the second variable
    [21, "@bar.baz"], // At the start of the second variable
    [28, "@bar.baz"], // At the end of the second variable
    [29, null], // On the braces right after the second variable
  ])("returns variable at given position %s", (position, expected) => {
    const template = "abc {{ @foo }} xyz {{@bar.baz}}.";
    const actual = getVariableAtPosition(template, position);
    expect(actual).toEqual(expected);
  });

  test.each([
    [12, null], // In the middle of the item variable "qux"
    [19, "@foo.bar.baz"], // At the start of the variable in the for loop "@foo.bar.baz"
    [30, "@foo.bar.baz"], // At the end of the variable in the for loop "@foo.bar.baz"
    [60, null], // In the middle of the item variable "qux.quux.quuux"
    [109, "@corge.grault.garply"], // At the beginning of the context variable in the loop body "@corge.grault.garply"
  ])("multiline template, variable at position %s", (position, expected) => {
    const template = `
    {% for qux in @foo.bar.baz %}
      Item value: {{ qux.quux.quuux }}
      Context var: {{ @corge.grault.garply }}
    {% endfor %}`;

    const actual = getVariableAtPosition(template, position);
    expect(actual).toEqual(expected);
  });

  test.each([8, 23])("repeated variables at position %s", (position) => {
    const template = "abc {{ @foo }} xyz {{@foo}}.";
    const actual = getVariableAtPosition(template, position);
    expect(actual).toEqual("@foo");
  });
});
