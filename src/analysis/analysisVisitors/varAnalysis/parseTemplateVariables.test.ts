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

    // The variable "item", which is defined by the loop and doesn't come from the context, is not included in the template variables
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
