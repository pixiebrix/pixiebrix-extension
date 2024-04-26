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
    await expect(locator).toBeVisible({ timeout: 0 }); // Retry handling is done by the outer expect
  }).toPass({ timeout: 5000, ...options });
}

// Run a mod via the Quickbar.
export async function runModViaQuickBar(page: Page, modName: string) {
  await waitForQuickBarReadiness(page);
  await page.locator("html").focus(); // Ensure the page is focused before running the keyboard shortcut
  await page.keyboard.press("Meta+M"); // MacOS
  await page.keyboard.press("Control+M"); // Windows and Linux
  // Short delay to allow the quickbar to finish loading - TODO: Find a better way to detect when the quickbar is done loading opening
  await page.waitForTimeout(500);
  await page.getByRole("option", { name: modName }).click();
}

function findSidebarPage(page: Page, extensionId: string): Page | undefined {
  return page
    .context()
    .pages()
    .find((value) =>
      value.url().startsWith(`chrome-extension://${extensionId}/sidebar.html`),
    );
}

function findSidebarFrame(page: Page, extensionId: string): Frame | undefined {
  return page
    .frames()
    .find((frame) =>
      frame.url().startsWith(`chrome-extension://${extensionId}/sidebar.html`),
    );
}

/**
 * Immediately returns whether the sidebar is open. Works on both MV2 and MV3.
 * @see getSidebarPage
 */
export function isSidebarOpen(page: Page, extensionId: string): boolean {
  const match =
    MV === "3"
      ? findSidebarPage(page, extensionId)
      : findSidebarFrame(page, extensionId);

  return match != null;
}

/**
 * Finds the Pixiebrix sidebar page/frame.
 *
 * For MV3, automatically clicks "OK" on the dialog that appears if the sidebar requires a user gesture to open
 *
 * - In MV3, this is a Page contained in the browser sidepanel window.
 * - In MV2, this is a Frame as it's contained in an iframe attached to the current page.
 *
 * @throws {Error} if the sidebar is not available
 */
export async function getSidebarPage(
  page: Page,
  extensionId: string,
): Promise<Page | Frame> {
  if (MV === "3") {
    let sidebarPage: Page | undefined;

    // In MV3, the sidebar sometimes requires the user to interact with modal to open the sidebar via a user gesture
    const conditionallyPerformUserGesture = async () => {
      await expect(page.getByRole("button", { name: "OK" })).toBeVisible();
      await page.getByRole("button", { name: "OK" }).click();
      return findSidebarPage(page, extensionId);
    };

    await expect(async () => {
      sidebarPage = await Promise.race([
        conditionallyPerformUserGesture(),
        findSidebarPage(page, extensionId),
      ]);
      expect(sidebarPage).toBeDefined();
    }).toPass({ timeout: 5000 });

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion  -- checked above
    return sidebarPage!;
  }

  let sidebarFrame: Frame | undefined;
  await expect(() => {
    sidebarFrame = findSidebarFrame(page, extensionId);
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

// Waits for the quick bar to be ready to use
export async function waitForQuickBarReadiness(page: Page) {
  await expect(async () => {
    const pbReady = await page
      .locator("html")
      .getAttribute("data-pb-quick-bar-ready");
    expect(pbReady).toBeTruthy();
  }).toPass({ timeout: 5000 });
}
