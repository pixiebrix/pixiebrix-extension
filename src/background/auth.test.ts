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

import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import { getToken } from "./auth";
import { type UUID } from "@/core";
import { uuidv4 } from "@/types/helpers";

const axiosMock = new MockAdapter(axios);

const getOneToken = async (id: UUID) =>
  getToken(
    {
      // @ts-expect-error The result isn't necessary at this time
      getTokenContext: () => ({}),
      isToken: true,
    },
    { id }
  );

describe("getToken", () => {
  test("multiple requests are temporarily memoized", async () => {
    let userId = 0;
    axiosMock.onPost().reply(() => [200, userId++]); // Increase ID at every request

    const id1 = uuidv4();
    // Consecutive calls should make new requests
    expect(await getOneToken(id1)).toBe(0);
    expect(await getOneToken(id1)).toBe(1);

    // Parallel calls should make one request
    expect(
      await Promise.all([getOneToken(id1), getOneToken(id1)])
    ).toStrictEqual([2, 2]);

    // Parallel calls but with different auth.id’s should make multiple requests
    const id2 = uuidv4();
    expect(
      await Promise.all([getOneToken(id1), getOneToken(id2)])
    ).toStrictEqual([3, 4]);
  });
});
