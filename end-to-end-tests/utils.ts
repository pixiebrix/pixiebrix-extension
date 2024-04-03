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

import type AxeBuilder from "@axe-core/playwright";
import { type Locator, expect, type Page, type Frame } from "@playwright/test";
import { MV } from "./env";

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
    (violation) => !allowedViolations.includes(violation.id),
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

// This function is a workaround for the fact that `expect(locator).toBeVisible()` will immediately fail if the element is hidden or unmounted.
// This function will retry the expectation until the element is visible or the timeout is reached.
export async function ensureVisibility(
  locator: Locator,
  options?: { timeout: number },
) {
  await expect(async () => {
    await expect(locator).toBeVisible();
  }).toPass({ timeout: 5000, ...options });
}

// Finds the Pixiebrix sidebar page. In MV3, this is a Page contained in the browser sidepanel window.
// In MV2, this is a Frame as it's contained in an iframe attached to the current page.
export async function getSidebarPage(page: Page, extensionId: string) {
  if (MV === "3") {
    let sidebarPage: Page | undefined;
    const findSidebarPage = (page: Page) =>
      page
        .context()
        .pages()
        .find((value) =>
          value
            .url()
            .startsWith(`chrome-extension://${extensionId}/sidebar.html`),
        );
    await expect(() => {
      sidebarPage = findSidebarPage(page);
      expect(sidebarPage).toBeDefined();
    }).toPass({ timeout: 5000 });
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion  -- checked above
    return sidebarPage!;
  }

  let sidebarFrame: Frame | undefined;
  const findSidebarFrame = (page: Page) =>
    page
      .frames()
      .find((frame) =>
        frame
          .url()
          .startsWith(`chrome-extension://${extensionId}/sidebar.html`),
      );
  await expect(() => {
    sidebarFrame = findSidebarFrame(page);
    expect(sidebarFrame).toBeDefined();
  }).toPass({ timeout: 5000 });
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion -- checked above
  return sidebarFrame!;
}

// Waits for the selection menu to be ready to use (listeners are created and at least one action is registered).
// see: https://github.com/pixiebrix/pixiebrix-extension/blob/5693a4db1c4f3411910ef9cf6a60f5a20c132761/src/contentScript/textSelectionMenu/selectionMenuController.tsx#L336
export async function waitForSelectionMenuReadiness(page: Page) {
  await expect(async () => {
    const pbReady = await page
      .locator("html")
      .getAttribute("data-pb-selection-menu-ready");
    expect(pbReady).toBeTruthy();
  }).toPass({ timeout: 5000 });
}
