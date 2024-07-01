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

import {
  isTourInProgress,
  registerTour,
} from "@/starterBricks/tour/tourController";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import pDefer from "p-defer";
import { RunSubTourEffect } from "@/bricks/effects/runSubTour";
import { unsafeAssumeValidArg } from "@/runtime/runtimeTypes";
import ConsoleLogger from "@/utils/ConsoleLogger";
import { tick } from "@/starterBricks/starterBrickTestUtils";
import {
  type ModComponentBase,
  type HydratedModComponent,
} from "@/types/modComponentTypes";
import { brickOptionsFactory } from "@/testUtils/factories/runtimeFactories";

describe("runSubTour", () => {
  test("it runs a sub-tour", async () => {
    const blueprintId = validateRegistryId("test");

    const abortController = new AbortController();
    const deferredTour = pDefer<void>();

    await registerTour({
      blueprintId,
      extension: {
        id: uuidv4(),
        label: "Test Extension",
        _recipe: { id: blueprintId } as ModComponentBase["_recipe"],
      } as HydratedModComponent,
      allowUserRun: false,
      run: () => ({
        promise: deferredTour.promise,
        abortController,
      }),
    });

    const brick = new RunSubTourEffect();

    const promise = brick.run(
      unsafeAssumeValidArg({ tour: "Test Extension" }),
      brickOptionsFactory({
        logger: new ConsoleLogger({ modId: blueprintId }),
      }),
    );

    await tick();

    expect(isTourInProgress()).toBe(true);

    deferredTour.resolve();

    await expect(promise).resolves.toBeUndefined();
  });
});
