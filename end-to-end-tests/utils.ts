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
  return new Set(
    accessibilityScanResults.violations.flatMap(({ id, impact }) =>
      impact === "critical" ? [] : [id],
    ),
  );
}

export function checkForCriticalViolations(
  accessibilityScanResults: AxeResults,
  allowedViolations: string[] = [],
) {
  const criticalViolations = [
    ...criticalViolationsFromAxeResults(accessibilityScanResults),
  ];
  if (criticalViolations.some((rule) => !allowedViolations.includes(rule))) {
    console.warn(
      "Found Critical Accessibility Violations. Full report:",
      JSON.stringify(accessibilityScanResults.violations, null, 2),
    );
  }

  expect(criticalViolations).toEqual(allowedViolations);
}
