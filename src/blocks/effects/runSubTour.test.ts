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

import {
  isTourInProgress,
  registerTour,
} from "@/extensionPoints/tourController";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import pDefer from "p-defer";
import { RunSubTourEffect } from "@/blocks/effects/runSubTour";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { tick } from "@/extensionPoints/extensionPointTestUtils";
import { IExtension, ResolvedExtension } from "@/types/extensionTypes";
import { BlockOptions } from "@/types/runtimeTypes";

describe("runSubTour", () => {
  test("it runs a sub-tour", async () => {
    const blueprintId = validateRegistryId("test");

    const abortController = new AbortController();
    const deferredTour = pDefer<void>();

    registerTour({
      blueprintId,
      extension: {
        id: uuidv4(),
        label: "Test Extension",
        _recipe: { id: blueprintId } as IExtension["_recipe"],
      } as ResolvedExtension,
      allowUserRun: false,
      run: () => ({
        promise: deferredTour.promise,
        abortController,
      }),
    });

    const brick = new RunSubTourEffect();

    const promise = brick.run(
      unsafeAssumeValidArg({ tour: "Test Extension" }),
      { logger: new ConsoleLogger({ blueprintId }) } as BlockOptions
    );

    await tick();

    expect(isTourInProgress()).toBe(true);

    deferredTour.resolve();

    await expect(promise).resolves.toBeUndefined();
  });
});
