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

import { AlertEffect } from "@/blocks/effects/alert";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { type BlockOptions } from "@/types/runtimeTypes";

const brick = new AlertEffect();

describe("AlertEffect", () => {
  it("type defaults to window", async () => {
    window.alert = jest.fn();
    await brick.run(
      unsafeAssumeValidArg({ message: "Hello, world!" }),
      {} as BlockOptions
    );
    expect(window.alert).toHaveBeenCalledWith("Hello, world!");
  });
});
