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

import { expect } from "./fixtures/extensionBase";
import type AxeBuilder from "@axe-core/playwright";

type AxeResults = Awaited<ReturnType<typeof AxeBuilder.prototype.analyze>>;

function criticalViolationsFromAxeResults(
  accessibilityScanResults: AxeResults,
) {
  return accessibilityScanResults.violations.flatMap((violation) =>
    violation.impact === "critical" ? [] : [violation],
  );
}

export function checkForCriticalViolations(
  accessibilityScanResults: AxeResults,
  allowedViolations: string[] = [],
) {
  const criticalViolations = criticalViolationsFromAxeResults(
    accessibilityScanResults,
  );

  const unallowedViolations = criticalViolations.filter(
    (violation) =>
      !allowedViolations.some((allowed) => violation.id === allowed),
  );

  const absentAllowedViolations = allowedViolations.filter(
    (allowed) =>
      !criticalViolations.some((violation) => violation.id === allowed),
  );

  for (const rule of absentAllowedViolations) {
    console.info(
      `Allowed a11y violation rule "${rule}" is not present anymore. It can be removed.`,
    );
  }

  // Expectation only fails if there are any criticalViolations that aren't explicitly allowed
  expect(unallowedViolations).toEqual([]);
}
