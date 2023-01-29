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
  cancelAllTours,
  isTourInProgress,
  markTourEnd,
  markTourStart,
  registerTour,
  runSubTour,
} from "@/extensionPoints/tourController";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import pDefer from "p-defer";

describe("tourController", () => {
  test("ad-hoc tour", () => {
    const nonce = uuidv4();
    const extensionId = uuidv4();
    const abortController = new AbortController();
    markTourStart(
      nonce,
      { id: extensionId, label: "Ad-hoc", _recipe: null },
      { abortController }
    );

    expect(isTourInProgress()).toBe(true);

    markTourEnd(nonce, { id: extensionId });

    expect(isTourInProgress()).toBe(false);
  });

  test("cancel all tours", () => {
    const nonce = uuidv4();
    const extensionId = uuidv4();
    const abortController = new AbortController();
    markTourStart(
      nonce,
      { id: extensionId, label: "Ad-hoc", _recipe: null },
      { abortController }
    );

    expect(isTourInProgress()).toBe(true);

    cancelAllTours();

    expect(isTourInProgress()).toBe(false);
  });

  test("register and run sub-tour", async () => {
    const blueprintId = validateRegistryId("test/tour");

    const tourPromise = pDefer<void>();

    registerTour({
      blueprintId,
      extension: { id: uuidv4(), label: "Test Tour", _recipe: null },
      allowUserRun: false,
      run: () => ({
        promise: tourPromise.promise,
        abortController: new AbortController(),
      }),
    });

    const { promise: subTourPromise } = await runSubTour({
      tour: "Test Tour",
      blueprintId,
    });

    tourPromise.resolve();

    await expect(subTourPromise).resolves.toBe(undefined);
  });
});
