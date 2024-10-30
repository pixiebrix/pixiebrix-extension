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

import {
  getFullVariableName,
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
    expect(actual).toBe("@foo");
  });

  test("indexed access", () => {
    const template = "abc {{ @foo[0].bar }}.";
    const actual = getLikelyVariableAtPosition(template, 8).name;
    expect(actual).toBe("@foo[0].bar");
  });

  test("access with []", () => {
    const template = "abc {{ @foo['bar baz'] }}.";
    const actual = getLikelyVariableAtPosition(template, 8).name;
    expect(actual).toBe("@foo['bar baz']");
  });

  test("standalone @", () => {
    const template = "abc @";
    const actual = getLikelyVariableAtPosition(template, 4).name;
    expect(actual).toBe("@");
  });

  test("clamp position on full match", () => {
    const template = "@abc";
    const actual = getLikelyVariableAtPosition(template, 2, {
      clampPosition: true,
      includeBoundary: true,
    }).name;
    expect(actual).toBe("@a");
  });

  test("clamp position on partial match", () => {
    const template = "{{ @abc";
    const actual = getLikelyVariableAtPosition(template, 5, {
      clampPosition: true,
      includeBoundary: true,
    }).name;
    expect(actual).toBe("@a");
  });

  test("match end boundary", () => {
    const template = "@abc";
    const actual = getLikelyVariableAtPosition(template, 4, {
      includeBoundary: true,
      clampPosition: true,
    }).name;
    expect(actual).toBe("@abc");
  });

  test("match end boundary on partial match", () => {
    const template = "{{ @abc";
    const actual = getLikelyVariableAtPosition(template, 7, {
      includeBoundary: true,
      clampPosition: true,
    }).name;
    expect(actual).toBe("@abc");
  });

  test("match start boundary", () => {
    const template = "{{ @abc }}";
    const actual = getLikelyVariableAtPosition(template, 3, {
      includeBoundary: true,
      clampPosition: true,
    }).name;
    expect(actual).toBe("@");
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
    },
  );

  test("standalone @", () => {
    const template = "abc @";
    const actual = getLikelyVariableAtPosition(template, 4);
    expect(actual.startIndex).toBe(4);
    expect(actual.endIndex).toBe(5);
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
      const { newTemplate: actual, newCursorPosition } = replaceLikelyVariable(
        template,
        position,
        replacement,
      );

      const endOfVariableIndex =
        expected.indexOf(replacement) + replacement.length;

      expect(actual).toEqual(expected);
      expect(newCursorPosition).toEqual(endOfVariableIndex);
    },
  );

  test("inserts the new var if no likely variable found in the text", () => {
    const { newTemplate: actual, newCursorPosition } = replaceLikelyVariable(
      template,
      0,
      "@qux.quux",
    );

    const expectedTemplate = "{{ @qux.quux }}" + template;
    const endOfVariableIndex =
      expectedTemplate.indexOf("@qux.quux") + "@qux.quux".length;

    expect(actual).toEqual("{{ @qux.quux }}" + template);
    expect(newCursorPosition).toEqual(endOfVariableIndex);
  });

  test("inserts {{ }}", () => {
    const { newTemplate: actual, newCursorPosition } = replaceLikelyVariable(
      "abc @foo xyz",
      5,
      "@bar",
    );

    const expectedTemplate = "abc {{ @bar }} xyz";
    const endOfVariableIndex = expectedTemplate.indexOf("@bar") + "@bar".length;

    expect(actual).toBe(expectedTemplate);
    expect(newCursorPosition).toEqual(endOfVariableIndex);
  });

  test("inserts {{ only", () => {
    const { newTemplate: actual, newCursorPosition } = replaceLikelyVariable(
      "abc @foo}} xyz",
      4,
      "@bar",
    );

    const expectedTemplate = "abc {{ @bar }} xyz";
    const endOfVariableIndex = expectedTemplate.indexOf("@bar") + "@bar".length;

    expect(actual).toBe("abc {{ @bar}} xyz");
    expect(newCursorPosition).toEqual(endOfVariableIndex);
  });

  test("does't insert braces in {% %}", () => {
    const template = `
    {% for qux in @foo %}
      abc
    {% endfor %}`;

    const expectedTemplate = `
    {% for qux in @baz %}
      abc
    {% endfor %}`;

    const endOfVariableIndex = expectedTemplate.indexOf("@baz") + "@baz".length;

    const { newTemplate: actual, newCursorPosition } = replaceLikelyVariable(
      template,
      20,
      "@baz",
    );

    expect(actual).toBe(expectedTemplate);
    expect(newCursorPosition).toEqual(endOfVariableIndex);
  });

  test("inserts {{ only in for body", () => {
    const template = `
    {% for qux in @foo %}
      abc @bar }}
    {% endfor %}`;
    const { newTemplate: actual, newCursorPosition } = replaceLikelyVariable(
      template,
      39,
      "@baz",
    );

    const expectedTemplate = `
    {% for qux in @foo %}
      abc {{ @baz }}
    {% endfor %}`;

    const endOfVariableIndex = expectedTemplate.indexOf("@baz") + "@baz".length;

    expect(actual).toEqual(expectedTemplate);
    expect(newCursorPosition).toEqual(endOfVariableIndex);
  });

  test("inserts }} only", () => {
    const { newTemplate: actual, newCursorPosition } = replaceLikelyVariable(
      "abc {{@foo xyz",
      8,
      "@bar",
    );
    const expectedTemplate = "abc {{@bar }} xyz";
    const endOfVariableIndex = expectedTemplate.indexOf("@bar") + "@bar".length;

    expect(actual).toEqual(expectedTemplate);
    expect(newCursorPosition).toEqual(endOfVariableIndex);
  });

  test("inserts %}", () => {
    const { newTemplate: actual, newCursorPosition } = replaceLikelyVariable(
      "abc {% for foo in @bar xyz",
      18,
      "@bar",
    );
    const expectedTemplate = "abc {% for foo in @bar %} xyz";
    const endOfVariableIndex = expectedTemplate.indexOf("@bar") + "@bar".length;

    expect(actual).toEqual(expectedTemplate);
    expect(newCursorPosition).toEqual(endOfVariableIndex);
  });

  test("inserts }} only in for body", () => {
    const template = `
    {% for qux in @foo %}
      abc {{ @bar
    {% endfor %}`;

    const expectedTemplate = `
    {% for qux in @foo %}
      abc {{ @baz }}
    {% endfor %}`;

    const endOfVariableIndex = expectedTemplate.indexOf("@baz") + "@baz".length;

    const { newTemplate: actual, newCursorPosition } = replaceLikelyVariable(
      template,
      41,
      "@baz",
    );

    expect(actual).toEqual(expectedTemplate);
    expect(newCursorPosition).toEqual(endOfVariableIndex);
  });
});

describe("getFullVariableName", () => {
  it("preserves optional chaining", () => {
    expect(getFullVariableName("@foo", ["@foo", "bar"])).toBe("@foo.bar");
    expect(getFullVariableName("@foo?", ["@foo", "bar"])).toBe("@foo?.bar");
    expect(getFullVariableName("@foo?.bar?", ["@foo", "bar", "baz"])).toBe(
      "@foo?.bar?.baz",
    );
  });

  // TODO: #8638: https://github.com/pixiebrix/pixiebrix-extension/issues/8638
  it.skip("#8638: handle ? in property accessor", () => {
    expect(
      getFullVariableName('@foo.bar["hello world?"]?', [
        "@foo",
        "bar",
        "hello world?",
        "qux",
      ]),
    ).toBe('@foo.bar["hello world?"]?.qux');
  });

  it("handles optional chaining with bracket notation", () => {
    expect(
      getFullVariableName("@foo.bar?.[42]", ["@foo", "bar", "42", "qux"]),
    ).toBe("@foo.bar?.[42].qux");
    expect(
      getFullVariableName("@foo.bar[42]?", ["@foo", "bar", "42", "qux"]),
    ).toBe("@foo.bar[42]?.qux");
    expect(
      getFullVariableName('@foo.bar[""]?', ["@foo", "bar", "", "qux"]),
    ).toBe('@foo.bar[""]?.qux');
    expect(
      getFullVariableName('@foo?.["hello world?"]', [
        "@foo",
        "hello world?",
        "bar",
      ]),
    ).toBe('@foo?.["hello world?"].bar');
  });

  it("handles trailing number", () => {
    expect(getFullVariableName("@ou", ["@output2"])).toBe("@output2");
  });
});
