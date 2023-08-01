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

// From https://github.com/sindresorhus/p-memoize/blob/52fe6052ff2287f528c954c4c67fc5a61ff21360/test.ts#LL198
import { memoizeUntilSettled } from "@/utils/promiseUtils";

test("memoizeUntilSettled", async () => {
  let index = 0;

  const memoized = memoizeUntilSettled(async () => index++);

  expect(await memoized()).toBe(0);
  expect(await memoized()).toBe(1);
  expect(await memoized()).toBe(2);
  expect(await Promise.all([memoized(), memoized()])).toStrictEqual([3, 3]);
});
