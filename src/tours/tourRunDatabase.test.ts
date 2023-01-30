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

import { getAll, recordEnd, recordStart } from "@/tours/tourRunDatabase";
import { uuidv4 } from "@/types/helpers";

describe("tourRunDatabase", () => {
  test("put/update/retrieve", async () => {
    const nonce = uuidv4();

    await recordStart({
      id: nonce,
      extensionId: uuidv4(),
      packageId: null,
      tourName: "Tour",
    });

    await recordEnd(nonce, {
      completed: true,
      errored: false,
      skipped: false,
    });

    const records = await getAll();

    expect(records).toHaveLength(1);
    expect(records[0].id).toEqual(nonce);
  });

  test("ignore update of unknown tour", async () => {
    const nonce = uuidv4();

    await recordEnd(nonce, {
      completed: true,
      errored: false,
      skipped: false,
    });

    const records = await getAll();
    expect(records.some((x) => x.id === nonce)).toBe(false);
  });
});
