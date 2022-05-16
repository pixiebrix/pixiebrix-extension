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

import { searchData } from "@/components/jsonTree/JsonTree";

interface SearchDataTestCase {
  name: string;
  query: string;
  data: unknown;
  expected: unknown;
}

const searchDataCases: SearchDataTestCase[] = [
  {
    name: "exact key",
    query: "myKey",
    data: {
      foo: "bar",
      myKey: 42,
    },
    expected: {
      myKey: 42,
    },
  },
  {
    name: "exact key nested",
    query: "myKey",
    data: {
      foo: {
        myKey: 32,
      },
      bar: "baz",
      myKey: {
        lorem: "ipsum",
        who: "me?",
      },
      qux: {
        quux: false,
      },
    },
    expected: {
      foo: {
        myKey: 32,
      },
      myKey: {
        lorem: "ipsum",
        who: "me?",
      },
    },
  },
  {
    name: "partial key",
    query: "myKey",
    data: {
      foo: "bar",
      myKeyNumber: 42,
      theOtherMyKey: true,
      myKeyObject: {
        baz: "qux",
        quux: 19,
      },
    },
    expected: {
      myKeyNumber: 42,
      theOtherMyKey: true,
      myKeyObject: {
        baz: "qux",
        quux: 19,
      },
    },
  },
  {
    name: "partial key nested",
    query: "myKey",
    data: {
      foo: {
        myKeyNumber: 42,
      },
      theOtherMyKey: {
        bar: {
          baz: false,
        },
        qux: "quux",
      },
      a: {
        b: {
          myKeyNested: {
            c: 2,
            d: 3,
          },
          anotherKey: {
            huh: "what",
          },
        },
      },
      notAMatchingKey: false,
    },
    expected: {
      foo: {
        myKeyNumber: 42,
      },
      theOtherMyKey: {
        bar: {
          baz: false,
        },
        qux: "quux",
      },
      a: {
        b: {
          myKeyNested: {
            c: 2,
            d: 3,
          },
        },
      },
    },
  },
  {
    name: "exact array key",
    query: "myKey",
    data: [
      {
        myKey: 42,
        foo: "bar",
      },
      {
        baz: "qux",
        quux: false,
      },
    ],
    expected: [
      {
        myKey: 42,
      },
    ],
  },
  {
    name: "exact array key nested",
    query: "myKey",
    data: {
      foo: [
        {
          myKey: "abc",
          bar: "baz",
        },
        {
          myKey: "def",
          bar: "baz",
        },
      ],
      qux: 42,
      myKey: [
        {
          a: 1,
        },
        {
          b: 2,
        },
      ],
    },
    expected: {
      foo: [
        {
          myKey: "abc",
        },
        {
          myKey: "def",
        },
      ],
      myKey: [
        {
          a: 1,
        },
        {
          b: 2,
        },
      ],
    },
  },
  {
    name: "partial array key",
    query: "myKey",
    data: [
      {
        myKeyNumber: 42,
        foo: "bar",
      },
      {
        anotherMyKey: {
          baz: "qux",
        },
        foo: "bar",
      },
      {
        foo: "bar",
      },
    ],
    expected: [
      {
        myKeyNumber: 42,
      },
      {
        anotherMyKey: {
          baz: "qux",
        },
      },
    ],
  },
  {
    name: "partial array key nested",
    query: "myKey",
    data: {
      foo: [
        {
          myKeyNumber: 42,
          foo: "bar",
        },
        {
          anotherMyKey: {
            baz: "qux",
          },
        },
        {
          foo: "bar",
        },
      ],
      theWrongKey: {
        quux: [
          {
            a: 1,
          },
          {
            b: 2,
          },
        ],
        yetAnotherMyKey: [1, 2, 3, 4, 5],
      },
    },
    expected: {
      foo: [
        {
          myKeyNumber: 42,
        },
        {
          anotherMyKey: {
            baz: "qux",
          },
        },
      ],
      theWrongKey: {
        yetAnotherMyKey: [1, 2, 3, 4, 5],
      },
    },
  },
  {
    name: "exact value number",
    query: "42",
    data: {
      myKey: 42,
      foo: "bar",
      baz: [40, 41, 42, 43, 44, 45],
    },
    expected: {
      myKey: 42,
      // Should the entire array be returned if one value matches without nesting?
      // (See the TO-DO in searchData() JsonTree.tsx)
      baz: [42],
    },
  },
  {
    name: "exact value",
    query: "myValue",
    data: {
      myKey: "myValue",
      foo: {
        myKey: "myValue",
      },
      bar: {
        myKey: "anotherValue",
      },
      baz: {
        myKey: "oneMoreValue",
      },
      qux: {
        quux: {
          a: "myValue",
          b: "anotherValue",
        },
      },
      stringArray: ["something", "myValue", "anotherValue"],
      objectArray: [
        {
          myKey: "myValue",
          anotherKey: "anotherValue",
        },
        {
          myKey: "notTheValue",
          anotherKey: "myValue",
        },
      ],
    },
    expected: {
      myKey: "myValue",
      foo: {
        myKey: "myValue",
      },
      qux: {
        quux: {
          a: "myValue",
        },
      },
      stringArray: ["myValue"],
      objectArray: [
        {
          myKey: "myValue",
        },
        {
          anotherKey: "myValue",
        },
      ],
    },
  },
  {
    name: "partial value",
    query: "myValue",
    data: {
      foo: "this includes myValue",
      bar: "myValue, this also includes",
      baz: "for this one, myValue is in the middle",
      qux: "this string doesn't match",
      quux: "this one also should not match the value",
      config: {
        someSetting: "includes myValue",
        anotherSetting: "doesn't have it",
        anArraySetting: [
          {
            name: "option 1",
            description: "myValue included here",
          },
          {
            name: "option 2",
            decription: "not included here",
          },
        ],
      },
      items: [
        "this doesn't match",
        "this includes myValue",
        "not the right value",
        "myValue matches this one too",
      ],
    },
    expected: {
      foo: "this includes myValue",
      bar: "myValue, this also includes",
      baz: "for this one, myValue is in the middle",
      config: {
        someSetting: "includes myValue",
        anArraySetting: [
          // Should the full object(s) get returned if one of its values matches?
          // (See the TO-DO in searchData() JsonTree.tsx)
          {
            description: "myValue included here",
          },
        ],
      },
      items: ["this includes myValue", "myValue matches this one too"],
    },
  },
  {
    name: "exact string",
    query: "my search string",
    data: "my SEARCH String",
    expected: "my SEARCH String",
  },
  {
    name: "partial string",
    query: "bar",
    data: "foo bar baz",
    expected: "foo bar baz",
  },
];

const searchDataTestCases: ReadonlyArray<
  [name: string, query: string, data: unknown, expected: unknown]
> = searchDataCases.map(({ name, query, data, expected }) => [
  name,
  query,
  data,
  expected,
]);

describe("JsonTree - searchData", () => {
  test.each(searchDataTestCases)(
    "matches data with %s",
    async (_, query, data, expected) => {
      expect(searchData(query, data)).toStrictEqual(expected);
    }
  );
});
