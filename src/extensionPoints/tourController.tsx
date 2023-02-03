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

import React from "react";
import {
  type MessageContext,
  type RegistryId,
  type ResolvedExtension,
  type UUID,
} from "@/core";
import { remove, reverse } from "lodash";
import { BusinessError, CancelError } from "@/errors/businessErrors";
import { uuidv4 } from "@/types/helpers";
import { isSpecificError } from "@/errors/errorHelpers";
import quickBarRegistry from "@/components/quickBar/quickBarRegistry";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMapSigns } from "@fortawesome/free-solid-svg-icons";
import { recordEnd, recordStart } from "@/tours/tourRunDatabase";
import { reportEvent } from "@/telemetry/events";
import { selectEventData } from "@/telemetry/deployments";

/**
 * A run of a tour.
 */
type TourRun = {
  /**
   * Tour run nonce for debugging and telemetry
   */
  nonce: UUID;
  /**
   * The extensionId that ran the tour.
   */
  extensionId: UUID;
  /**
   * Promise that resolves when the tour completes.
   */
  promise?: Promise<void>;
  /**
   * Abort controller to cancel the tour.
   */
  abortController: AbortController;
};

/**
 * Stack of tours in progress, with nested tours appearing toward the end of the array.
 */
const tourStack: TourRun[] = [];

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
  for (const { abortController } of reverse(tourStack)) {
    abortController.abort();
  }

  // Explicitly clear the stack. The tours should clean themselves up on abort, but this is a failsafe
  remove(tourStack, () => true);
}

/**
 * Return true if any tour is in progress.
 */
export function isTourInProgress(): boolean {
  return tourStack.length > 0;
}

/**
 * Return the currently executing tour, or none if no tour is in progress.
 */
export function getCurrentTour(): TourRun | null {
  return tourStack.at(-1);
}

/**
 * Mark that a tour is started
 * @param nonce the tour run nonce
 * @param extension the tour extension
 * @param abortController the abort controller for the tour to abort the tour
 * @param promise (optional) the promise that resolves when the tour completes
 * @param context additional data to include in the event
 * @private
 */
export function markTourStart(
  nonce: UUID,
  extension: {
    id: ResolvedExtension["id"];
    label: ResolvedExtension["label"];
    _recipe?: Pick<ResolvedExtension["_recipe"], "id">;
  },
  {
    promise,
    abortController,
    context,
  }: {
    promise?: Promise<void>;
    abortController: AbortController;
    context: MessageContext;
  }
): void {
  if (tourStack.some((x) => x.extensionId === extension.id)) {
    throw new BusinessError(`Tour already in progress: ${extension.id}`);
  }

  tourStack.push({
    nonce,
    extensionId: extension.id,
    promise,
    abortController,
  });

  void recordStart({
    id: nonce,
    extensionId: extension.id,
    tourName: extension.label,
    packageId: extension._recipe?.id,
  });

  reportEvent("TourStart", {
    id: nonce,
    tourName: extension.label,
    ...context,
  });
}

/**
 * Mark that a user is shown a tour step. Currently, tour steps are only recorded in remote telemetry.
 * @param nonce the tour run nonce
 * @param step the step name
 * @param eventData additional data to include in the event
 */
export function markTourStep(
  nonce: UUID,
  { step, context }: { step: string; context: MessageContext }
): void {
  reportEvent("TourStep", {
    nonce,
    step,
    ...context,
  });
}

/**
 * Mark that a tour completed, cancelled, or errored.
 *
 * Cancels all sub-tours nested within the tour.
 *
 * @param nonce the tour run nonce
 * @param error the error, or undefined if the tour completed successfully
 * @param context additional data to include in the event
 * @private
 */
export function markTourEnd(
  nonce: UUID,
  { error, context }: { error?: unknown; context: MessageContext }
) {
  let skipped = false;

  const tourInstance = tourStack.find((x) => x.nonce === nonce);

  if (tourInstance) {
    if (error && isSpecificError(error, CancelError)) {
      skipped = true;
    }

    void recordEnd(nonce, {
      errored: Boolean(error) && !skipped,
      skipped,
      completed: !error,
    });

    reportEvent("TourEnd", {
      id: nonce,
      ...context,
      errored: Boolean(error) && !skipped,
      skipped,
      completed: !error,
    });

    // Cancel other tours nested within this tour
    let otherTour: TourRun;
    while ((otherTour = tourStack.pop())?.nonce !== nonce) {
      otherTour.abortController.abort();
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
          quickBarRegistry.removeAction(`tour-${tour.extensionId}`);
        }
      }
    }
  }
}

/**
 * Register a tour on the page.
 * @param blueprintId the blueprint that contains the tour
 * @param extension the extension corresponding to the tour
 * @param allowUserRun whether the user can manually run the tour
 * @param run method to execute the tour content
 */
export function registerTour({
  blueprintId,
  extension,
  allowUserRun,
  run,
}: {
  blueprintId: RegistryId;
  extension: ResolvedExtension;
  allowUserRun?: boolean;
  run: () => { promise: Promise<void>; abortController: AbortController };
}): RegisteredTour {
  if (!blueprintTourRegistry.has(blueprintId)) {
    blueprintTourRegistry.set(blueprintId, new Map());
  }

  const blueprintTours = blueprintTourRegistry.get(blueprintId);
  const context = selectEventData(extension);

  const tour: RegisteredTour = {
    blueprintId,
    extensionId: extension.id,
    run() {
      const nonce = uuidv4();
      const { promise, abortController } = run();
      markTourStart(nonce, extension, { promise, abortController, context });

      // Decorate the extension promise with tour tracking
      const runPromise = promise
        // eslint-disable-next-line promise/prefer-await-to-then -- avoid separate method
        .then(() => {
          markTourEnd(nonce, { context });
        })
        // eslint-disable-next-line promise/prefer-await-to-then -- avoid separate method
        .catch((error) => {
          markTourEnd(nonce, { error, context });
        });

      return {
        nonce,
        extensionId: extension.id,
        promise: runPromise,
        abortController,
      };
    },
  };

  blueprintTours.set(extension.label, tour);

  if (allowUserRun) {
    // Register a quick bar action to run the tour if the user is allowed to manually run the tour
    quickBarRegistry.addAction({
      id: `tour-${extension.id}`,
      extensionId: extension.id,
      name: `Run Tour ${extension.label}`,
      icon: <FontAwesomeIcon icon={faMapSigns} />,
      perform() {
        tour.run();
      },
    });
  }

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
