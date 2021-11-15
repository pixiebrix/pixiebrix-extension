/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { loadBrickYaml, dumpBrickYaml } from "@/runtime/brickYaml";

describe("loadYaml", () => {
  test("deserialize var", async () => {
    expect(loadBrickYaml("foo: !var a.b.c")).toEqual({
      foo: {
        __type__: "var",
        __value__: "a.b.c",
      },
    });
  });

  test("deserialize mustache", async () => {
    expect(loadBrickYaml("foo: !mustache '{{ a.b.c }}!'")).toEqual({
      foo: {
        __type__: "mustache",
        __value__: "{{ a.b.c }}!",
      },
    });
  });
});

describe("dumpYaml", () => {
  test("serialize var", () => {
    const dumped = dumpBrickYaml({
      foo: {
        __type__: "var",
        __value__: "a.b.c",
      },
    });

    expect(dumped).toBe("foo: !var a.b.c\n");
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
});
