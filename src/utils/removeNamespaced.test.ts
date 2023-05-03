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

import { removeNamespaced } from "@/utils/removeNamespaced";

describe("removeNamespaced", () => {
  test("removes 1 level", () => {
    expect(removeNamespaced(testObject, "_", 1)).toStrictEqual({
      foo: 1,
      fooObject: {
        favoriteChild: 2,
        _child: 3,
        favoriteChildObject: {
          favoriteGrandChild: 4,
          _grandChild: 5,
        },
        _childObject: {
          favoriteGrandChild: 6,
          _grandChild: 7,
        },
      },
    });
  });

  test("removes 2 levels", () => {
    expect(removeNamespaced(testObject, "_", 2)).toStrictEqual({
      foo: 1,
      fooObject: {
        favoriteChild: 2,
        favoriteChildObject: {
          favoriteGrandChild: 4,
          _grandChild: 5,
        },
      },
    });
  });
});

const testObject = {
  foo: 1,
  fooObject: {
    favoriteChild: 2,
    _child: 3,
    favoriteChildObject: {
      favoriteGrandChild: 4,
      _grandChild: 5,
    },
    _childObject: {
      favoriteGrandChild: 6,
      _grandChild: 7,
    },
  },
  _unpopularSibling: {
    child: 8,
  },
};
