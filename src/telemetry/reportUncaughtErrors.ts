/*
 * Copyright (C) 2021 PixieBrix, Inc.
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

/**
 * How to use this module: It must be imported as early as possible in each entrypoint, once.
 * Refactor beware: Do not add "init" function or it will run too late.
 */

import { reportError } from "@/telemetry/logging";

function errorHandler(errorEvent: ErrorEvent | PromiseRejectionEvent): void {
  if (
    [...uncaughtErrorToIgnore].some((shouldIgnore) => shouldIgnore(errorEvent))
  ) {
    return;
  }

  reportError(errorEvent);
  errorEvent.preventDefault();
}

function avoidLoops(errorEvent: ErrorEvent | PromiseRejectionEvent): boolean {
  const wasSeen = seen.has(errorEvent);
  seen.add(errorEvent);
  return wasSeen;
}

export const uncaughtErrorToIgnore = new Set([avoidLoops]);
const seen = new WeakSet<ErrorEvent | PromiseRejectionEvent>();

window.addEventListener("error", errorHandler);
window.addEventListener("unhandledrejection", errorHandler);
