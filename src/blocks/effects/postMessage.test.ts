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

import PostMessageEffect from "@/blocks/effects/postMessage";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import { type BlockOptions } from "@/types/runtimeTypes";

const brick = new PostMessageEffect();

describe("postMessage", () => {
  it("is root aware", async () => {
    await expect(brick.isRootAware()).resolves.toBe(true);
  });

  it("messages frame", async () => {
    const frame = document.createElement("iframe");
    document.body.append(frame);

    frame.contentWindow.postMessage = jest.fn();

    await brick.run(
      unsafeAssumeValidArg({
        selector: "iframe",
        message: { text: "Hello, frame!" },
      }),
      { root: document } as BlockOptions
    );

    expect(frame.contentWindow.postMessage).toHaveBeenCalledWith(
      { text: "Hello, frame!" },
      "*"
    );
  });
});
