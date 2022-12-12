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

import {
  getLikelyVariableAtPosition,
  replaceLikelyVariable,
} from "./likelyVariableUtils";

describe("detects the variable and returns its name", () => {
  test.each([
    [0, null], // Before the first variable
    [6, null], // Inside the braces right before the variable
    [7, "@foo"], // At the start of the variable
    [11, "@foo"], // At the end of the variable
    [12, null], // After the variable
    [20, null], // On the braces before the second variable
    [21, "@bar.baz"], // At the start of the second variable
    [29, "@bar.baz"], // At the end of the second variable
    [30, null], // On the braces after the second variable
  ])("returns variable at given position %s", (position, expected) => {
    const template = "abc {{ @foo }} xyz {{@bar.baz}}.";
    const actual = getLikelyVariableAtPosition(template, position).name;
    expect(actual).toEqual(expected);
  });

  test.each([
    [10, null], // In the middle of the item variable "qux"
    [17, "@foo.bar.baz"], // At the start of the variable in the for loop "@foo.bar.baz"
    [29, "@foo.bar.baz"], // At the end of the variable in the for loop "@foo.bar.baz"
    [60, null], // In the middle of the item variable "qux.quux.quuux"
    [90, "@corge.grault.garply"], // At the beginning of the context variable in the loop body "@corge.grault.garply"
  ])("multiline template, variable at position %s", (position, expected) => {
    const template = `
  {% for qux in @foo.bar.baz %}
    Item value: {{ qux.quux.quuux }}
    Context var: {{ @corge.grault.garply }}
  {% endfor %}`;

    const actual = getLikelyVariableAtPosition(template, position).name;
    expect(actual).toEqual(expected);
  });

  test.each([8, 23])("repeated variables at position %s", (position) => {
    const template = "abc {{ @foo }} xyz {{@foo}}.";
    const actual = getLikelyVariableAtPosition(template, position).name;
    expect(actual).toEqual("@foo");
  });

  test("indexed access", () => {
    const template = "abc {{ @foo[0].bar }}.";
    const actual = getLikelyVariableAtPosition(template, 8).name;
    expect(actual).toEqual("@foo[0].bar");
  });

  test("access with []", () => {
    const template = "abc {{ @foo['bar baz'] }}.";
    const actual = getLikelyVariableAtPosition(template, 8).name;
    expect(actual).toEqual("@foo['bar baz']");
  });

  test("standalone @", () => {
    const template = "abc @";
    const actual = getLikelyVariableAtPosition(template, 4).name;
    expect(actual).toEqual("@");
  });
});

describe("returns the start and end index of the variable", () => {
  test.each([
    [7, 7, 11],
    [21, 21, 29],
  ])(
    "returns start and end indexes of the variable at position %s",
    (position, expectedStartIndex, expectedEndIndex) => {
      const template = "abc {{ @foo }} xyz {{@bar.baz}}.";
      const actual = getLikelyVariableAtPosition(template, position);
      expect(actual.startIndex).toEqual(expectedStartIndex);
      expect(actual.endIndex).toEqual(expectedEndIndex);
    }
  );

  test("standalone @", () => {
    const template = "abc @";
    const actual = getLikelyVariableAtPosition(template, 4);
    expect(actual.startIndex).toEqual(4);
    expect(actual.endIndex).toEqual(5);
  });
});

describe("replaceLikelyVariable", () => {
  const template = "abc {{ @foo }} xyz {{@bar.baz}} {{@foo}}.";

  test.each([
    {
      position: 8,
      replacement: "@qux.quux",
      expected: "abc {{ @qux.quux }} xyz {{@bar.baz}} {{@foo}}.",
    },
    {
      position: 22,
      replacement: "@qux.quux",
      expected: "abc {{ @foo }} xyz {{@qux.quux}} {{@foo}}.",
    },
  ])(
    "replaces a variable at position $position",
    ({ position, replacement, expected }) => {
      const actual = replaceLikelyVariable(template, position, replacement);
      expect(actual).toEqual(expected);
    }
  );

  test("inserts the new var if no likely variable found in the text", () => {
    const actual = replaceLikelyVariable(template, 0, "@qux.quux");
    expect(actual).toEqual("{{ @qux.quux }}" + template);
  });

  test("inserts {{ }}", () => {
    const actual = replaceLikelyVariable("abc @foo xyz", 5, "@bar");
    expect(actual).toEqual("abc {{ @bar }} xyz");
  });

  test("inserts {{ only", () => {
    const actual = replaceLikelyVariable("abc @foo}} xyz", 4, "@bar");
    expect(actual).toEqual("abc {{ @bar}} xyz");
  });

  test("does't insert braces in {% %}", () => {
    const template = `
    {% for qux in @foo %}
      abc
    {% endfor %}`;
    const actual = replaceLikelyVariable(template, 20, "@baz");
    expect(actual).toEqual(`
    {% for qux in @baz %}
      abc
    {% endfor %}`);
  });

  test("inserts {{ only in for body", () => {
    const template = `
    {% for qux in @foo %}
      abc @bar }}
    {% endfor %}`;
    const actual = replaceLikelyVariable(template, 39, "@baz");
    expect(actual).toEqual(`
    {% for qux in @foo %}
      abc {{ @baz }}
    {% endfor %}`);
  });

  test("inserts }} only", () => {
    const actual = replaceLikelyVariable("abc {{@foo xyz", 8, "@bar");
    expect(actual).toEqual("abc {{@bar }} xyz");
  });

  test("inserts }} only in for body", () => {
    const template = `
    {% for qux in @foo %}
      abc {{ @bar
    {% endfor %}`;
    const actual = replaceLikelyVariable(template, 41, "@baz");
    expect(actual).toEqual(`
    {% for qux in @foo %}
      abc {{ @baz }}
    {% endfor %}`);
  });
});
