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

import { type RegistryId, type ResolvedExtension, type UUID } from "@/core";
import { remove, reverse } from "lodash";
import { BusinessError, CancelError } from "@/errors/businessErrors";
import { uuidv4 } from "@/types/helpers";
import { isSpecificError } from "@/errors/errorHelpers";
import notify from "@/utils/notify";

/**
 * Stack of in-progress tours (by IExtension.id)
 * @see IExtension.id
 */
const tourStack: UUID[] = [];

/**
 * Abort Controllers to cancel tour(s) in progress.
 * @see IExtension.id
 */
const tourAbortControllers: Map<UUID, AbortController> = new Map<
  UUID,
  AbortController
>();

/**
 * A run of a tour.
 */
type TourRun = {
  /**
   * Tour run nonce for debugging.
   */
  nonce: UUID;
  /**
   * Promise that resolves when the tour completes.
   */
  promise: Promise<void>;
  /**
   * Abort controller to cancel the tour.
   */
  abortController: AbortController;
};

export type RegisteredTour = {
  /**
   * The blueprint that contains the tour.
   */
  blueprintId: RegistryId;
  /**
   * The tour extension that implements the tour.
   */
  extensionId: UUID;
  /**
   * Callback to run the tour.
   */
  run: () => TourRun;
};

/**
 * Registry of tours by blueprintId and IExtension.label.
 * @see RunSubTourEffect
 * @see IExtension.label
 */
const blueprintTourRegistry = new Map<
  RegistryId,
  Map<string, RegisteredTour>
>();

/**
 * Immediately cancel all tours in progress.
 */
export function cancelAllTours(): void {
  // Cancel tours, starting with the most recently started
  for (const tourId of reverse(tourStack)) {
    tourAbortControllers.get(tourId)?.abort();
  }

  // Explicitly clear the stack. The tours should clean themselves up, but this is a failsafe
  remove(tourStack, () => true);
  tourAbortControllers.clear();
}

/**
 * Return true if any tour is in progress.
 */
export function isTourInProgress(): boolean {
  return tourStack.length > 0;
}

/**
 * Mark that a tour is started
 * @param extension the tour extension
 * @param abortController the abort controller for the tour to abort the tour
 * @private
 */
export function markTourStart(
  extension: Pick<ResolvedExtension, "id">,
  abortController: AbortController
): void {
  if (tourStack.includes(extension.id)) {
    throw new BusinessError(`Tour already in progress: ${extension.id}`);
  }

  tourStack.push(extension.id);
  tourAbortControllers.set(extension.id, abortController);
}

/**
 * Mark that a tour completed, cancelled, or errored.
 *
 * Cancels all sub-tours nested within the tour.
 *
 * @param extension the tour extension
 * @param error the error, or undefined if the tour completed successfully
 * @private
 */
export function markTourEnd(
  extension: Pick<ResolvedExtension, "id">,
  { error }: { error?: unknown } = {}
) {
  if (tourStack.includes(extension.id)) {
    if (error && !isSpecificError(error, CancelError)) {
      notify.error({ message: "Error running tour", error });
    }

    let tourId: UUID;
    while ((tourId = tourStack.pop()) !== extension.id) {
      tourAbortControllers.get(tourId)?.abort();
      tourAbortControllers.delete(tourId);
    }
  }
}

/**
 * Unregister tours by extension ID. NOTE: does not cancel tours in progress.
 * @param extensionIds extension ids to unregister
 */
export function unregisterTours(extensionIds: UUID[]): void {
  for (const extensionId of extensionIds) {
    for (const tours of blueprintTourRegistry.values()) {
      for (const [label, tour] of tours) {
        if (tour.extensionId === extensionId) {
          tours.delete(label);
        }
      }
    }
  }
}

/**
 * Register a tour on the page.
 * @param blueprintId the blueprint that contains the tour
 * @param extension the extension corresponding to the tour
 * @param run method to execute the tour content
 */
export function registerTour({
  blueprintId,
  extension,
  run,
}: {
  blueprintId: RegistryId;
  extension: ResolvedExtension;
  run: () => { promise: Promise<void>; abortController: AbortController };
}): RegisteredTour {
  if (!blueprintTourRegistry.has(blueprintId)) {
    blueprintTourRegistry.set(blueprintId, new Map());
  }

  const blueprintTours = blueprintTourRegistry.get(blueprintId);

  const tour = {
    blueprintId,
    extensionId: extension.id,
    run() {
      const nonce = uuidv4();
      const { promise, abortController } = run();
      markTourStart(extension, abortController);

      // Decorate the extension promise with tour tracking
      const runPromise = promise
        // eslint-disable-next-line promise/prefer-await-to-then -- avoid separate method
        .then(() => {
          markTourEnd(extension);
        })
        // eslint-disable-next-line promise/prefer-await-to-then -- avoid separate method
        .catch((error) => {
          markTourEnd(extension, { error });
        });

      return { promise: runPromise, abortController, nonce };
    },
  };

  blueprintTours.set(extension.label, tour);

  return tour;
}

/**
 * Run a sub-tour by name in a blueprint. Returns a promise of tour completion.
 * @param tour the IExtension.label of the tour to run
 * @param blueprintId the blueprint id containing the tours
 * @throws BusinessError if the tour does not exist
 */
export async function runSubTour({
  tour: tourName,
  blueprintId,
}: {
  tour: string;
  blueprintId: RegistryId;
}): Promise<TourRun> {
  const blueprintTours = blueprintTourRegistry.get(blueprintId) ?? new Map();

  const tour = blueprintTours.get(tourName);

  if (tour) {
    return tour.run();
  }

  throw new BusinessError(`Tour does not exist: ${tourName}`);
}
