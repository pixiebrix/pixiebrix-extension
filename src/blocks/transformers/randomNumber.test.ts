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

import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { RandomNumber } from "@/blocks/transformers/randomNumber";

describe("random number", () => {
  it("returns a random integer", async () => {
    const { value } = await new RandomNumber().transform(
      unsafeAssumeValidArg({ lower: 0, upper: 5 })
    );
    expect(value).toBeInteger();
  });

  it("returns a random float", async () => {
    const { value } = await new RandomNumber().transform(
      unsafeAssumeValidArg({ lower: 0, upper: 5, floating: true })
    );
    expect(value).not.toBeInteger();
    expect(value).toBeNumber();
  });
});
