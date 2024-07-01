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
  cancelAllTours,
  getCurrentTour,
  isTourInProgress,
  markTourEnd,
  markTourStart,
  registerTour,
  runSubTour,
} from "@/starterBricks/tour/tourController";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import pDefer from "p-defer";
import { type HydratedModComponent } from "@/types/modComponentTypes";
import { type RegistryId } from "@/types/registryTypes";

describe("tourController", () => {
  test("ad-hoc tour", () => {
    const nonce = uuidv4();
    const modComponentId = uuidv4();
    const abortController = new AbortController();
    markTourStart(
      nonce,
      { id: modComponentId, label: "Ad-hoc", _recipe: undefined },
      { abortController, context: { modComponentId: modComponentId } },
    );

    expect(isTourInProgress()).toBe(true);

    markTourEnd(nonce, { context: { modComponentId: modComponentId } });

    expect(isTourInProgress()).toBe(false);
  });

  test("cancel all tours", () => {
    const nonce = uuidv4();
    const modComponentId = uuidv4();
    const abortController = new AbortController();
    markTourStart(
      nonce,
      { id: modComponentId, label: "Ad-hoc", _recipe: undefined },
      { abortController, context: { modComponentId: modComponentId } },
    );

    expect(isTourInProgress()).toBe(true);

    cancelAllTours();

    expect(isTourInProgress()).toBe(false);
  });

  test("register and run sub-tour", async () => {
    const modId = validateRegistryId("test/tour");

    const tourPromise = pDefer<void>();

    await registerTour({
      blueprintId: modId,
      extension: {
        id: uuidv4(),
        label: "Test Tour",
        _recipe: undefined,
        apiVersion: "v3",
        extensionPointId: "" as RegistryId,
        config: {},
      } as HydratedModComponent,
      allowUserRun: false,
      run: () => ({
        promise: tourPromise.promise,
        abortController: new AbortController(),
      }),
    });

    const { promise: subTourPromise, nonce } = await runSubTour({
      tour: "Test Tour",
      blueprintId: modId,
    });

    expect(getCurrentTour()?.nonce).toBe(nonce);

    tourPromise.resolve();

    await expect(subTourPromise).resolves.toBeUndefined();
  });
});
