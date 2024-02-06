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

import { SplitText } from "@/bricks/transformers/splitText";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";

const brick = new SplitText();

describe("Split", () => {
  it("splits text into chunks", async () => {
    const result = await brick.run(
      unsafeAssumeValidArg({
        text: "this is a test!",
        chunkSize: 8,
        chunkOverlap: 2,
      }),
      brickOptionsFactory(),
    );

    expect(result).toStrictEqual({
      documents: [{ text: "this is " }, { text: "s a test" }, { text: "st!" }],
    });
  });
});
