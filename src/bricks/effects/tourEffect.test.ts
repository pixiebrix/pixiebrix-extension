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

import { TourEffect } from "@/bricks/effects/tourEffect";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { uuidv4 } from "@/types/helpers";
import { type BrickOptions } from "@/types/runtimeTypes";
import { CancelError, PropError } from "@/errors/businessErrors";
import { tick } from "@/starterBricks/extensionPointTestUtils";

const brick = new TourEffect();

const logger = new ConsoleLogger({
  extensionId: uuidv4(),
});

describe("TourEffect", () => {
  test("isRootAware", async () => {
    await expect(brick.isRootAware()).resolves.toBe(true);
  });

  test("require step", async () => {
    document.body.innerHTML = "<div>Test</div>";

    const promise = brick.run(unsafeAssumeValidArg({}), {
      logger,
      root: document,
    } as BrickOptions);
    await expect(promise).rejects.toThrow(PropError);
  });

  test("show tour step over document", async () => {
    document.body.innerHTML = "<div>Test</div>";

    const promise = brick.run(
      unsafeAssumeValidArg({ steps: [{ intro: "test content" }] }),
      { logger, root: document } as BrickOptions
    );

    await tick();

    expect(document.body.innerHTML).toContain("test content");
    $(document).find(".introjs-donebutton").click();

    await tick();

    await expect(promise).resolves.toBeUndefined();
  });

  test.skip("can abort using brick abortSignal", async () => {
    document.body.innerHTML = "<div>Test</div>";

    const abortController = new AbortController();

    const promise = brick.run(
      unsafeAssumeValidArg({ steps: [{ intro: "test content" }] }),
      {
        logger,
        root: document,
        abortSignal: abortController.signal,
      } as BrickOptions
    );

    await tick();

    expect(document.body.innerHTML).toContain("test content");

    // :shrug: I don't know why jest crashes here from the reject in the tour
    abortController.abort();

    await tick();

    await expect(promise).rejects.toThrow(CancelError);
  });
});
