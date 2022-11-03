/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { recordWarning } from "@/background/logging";

const APP_START_ACTION = "app:start";

/**
 * Adds a performance mark for the initialization of an app
 */
export function markAppStart() {
  performance.mark(APP_START_ACTION);
}

/**
 * Measures the time between the app start and the current time
 * @param action String message to log. A pattern to follow is <Place of measurement>:<Action>. For example, "sidebarExpanded:allRecipesLoaded"
 * @param reportThreshold The threshold in milliseconds to report the measurement as warning to rollbar. Pass null to not report
 */
export function measureDurationFromAppStart(
  action: string,
  reportThreshold: number | null = 5000
) {
  const { duration } = performance.measure(APP_START_ACTION);
  const message = `Performance: "${action}" took ${Math.round(duration)}ms`;
  const data = {
    duration,
    threshold: reportThreshold,
    timestamp: new Date().toISOString(),
  };
  console.debug(message, data);

  if (reportThreshold != null && duration > reportThreshold) {
    void recordWarning(null, message, data);
  }
}
