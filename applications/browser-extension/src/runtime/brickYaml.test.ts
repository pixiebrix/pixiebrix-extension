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

import { loadBrickYaml, dumpBrickYaml } from "./brickYaml";
import { toExpression } from "../utils/expressionUtils";

describe("loadYaml", () => {
  test("deserialize var", async () => {
    expect(loadBrickYaml("foo: !var a.b.c")).toEqual({
      foo: toExpression("var", "a.b.c"),
    });
  });

  test("deserialize mustache", async () => {
    expect(loadBrickYaml("foo: !mustache '{{ a.b.c }}!'")).toEqual({
      foo: toExpression("mustache", "{{ a.b.c }}!"),
    });
  });

  test("deserialize pipeline", async () => {
    expect(
      loadBrickYaml("foo: !pipeline\n  - id: '@pixiebrix/confetti'"),
    ).toEqual({
      // eslint-disable-next-line local-rules/noExpressionLiterals -- testing raw YAML tag
      foo: {
        __type__: "pipeline",
        __value__: [{ id: "@pixiebrix/confetti" }],
      },
    });
  });

  test("deserialize defer", async () => {
    expect(
      loadBrickYaml("foo: !defer\n  bar: !mustache '{{ @element }}'"),
    ).toEqual({
      foo: toExpression("defer", {
        bar: toExpression("mustache", "{{ @element }}"),
      }),
    });
  });
});

describe("dumpYaml", () => {
  test("serialize var", () => {
    const dumped = dumpBrickYaml({
      foo: toExpression("var", "a.b.c"),
    });

    expect(dumped).toBe("foo: !var a.b.c\n");
  });

  test("serialize pipeline", () => {
    const dumped = dumpBrickYaml({
      // eslint-disable-next-line local-rules/noExpressionLiterals -- testing raw YAML tag
      foo: {
        __type__: "pipeline",
        __value__: [{ id: "@pixiebrix/confetti" }],
      },
    });

    expect(dumped).toBe("foo: !pipeline \n  - id: '@pixiebrix/confetti'\n");
  });

  test("serialize defer", () => {
    const dumped = dumpBrickYaml({
      foo: toExpression("defer", { bar: 42 }),
    });

    expect(dumped).toBe("foo: !defer \n  bar: 42\n");
  });

  test("strips sharing information", () => {
    const dumped = dumpBrickYaml({
      metadata: {
        id: "test/brick",
        sharing: {
          foo: 42,
        },
      },
      sharing: {
        foo: 42,
      },
    });

    expect(dumped).toBe("metadata:\n  id: test/brick\n");
  });

  test("strips updated_at", () => {
    const dumped = dumpBrickYaml({
      metadata: {
        id: "test/brick",
        updated_at: "2021-11-18T00:00:00.000000Z",
      },
      updated_at: "2021-11-18T00:00:00.000000Z",
    });

    expect(dumped).toBe("metadata:\n  id: test/brick\n");
  });
});
