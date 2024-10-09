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
import {
  type Locator,
  expect,
  type Page,
  type BrowserContext,
} from "@playwright/test";
import { TOTP } from "otpauth";
import { type SupportedChannel, SupportedChannels } from "../playwright.config";

export const PRE_RELEASE_BROWSER_WORKFLOW_NAME = "Pre-release Browsers";

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
  expect(unallowedViolations).toStrictEqual([]);
}

// This function is a workaround for the fact that `expect(locator).toBeVisible()` will immediately fail if the element is hidden or unmounted.
// This function will retry the expectation until the element is visible or the timeout is reached.
export async function ensureVisibility(
  locator: Locator,
  options?: { timeout: number },
) {
  await expect(async () => {
    await expect(locator).toBeVisible({ timeout: 0 }); // Retry handling is done by the outer expect
  }).toPass({ timeout: 20_000, ...options });
}

// Run a mod via the Quickbar.
export async function runModViaQuickBar(page: Page, modName: string) {
  await waitForQuickBarReadiness(page);
  await page.locator("html").focus(); // Ensure the page is focused before running the keyboard shortcut

  const modifierKey = await getModifierKey(page);
  await page.keyboard.press(`${modifierKey}+M`);

  // Short delay to allow the quickbar to finish opening
  // eslint-disable-next-line playwright/no-wait-for-timeout -- TODO: Find a better way to detect when the quickbar is done loading opening
  await page.waitForTimeout(500);
  await page.getByRole("option", { name: modName }).click();
}

function findSidebarPage(page: Page, extensionId: string): Page | undefined {
  const matches = page
    .context()
    .pages()
    .filter((value) =>
      value.url().startsWith(`chrome-extension://${extensionId}/sidebar.html`),
    );

  if (matches.length > 1) {
    throw new Error("Multiple sidebar pages found");
  }

  return matches[0];
}

/**
 * Immediately returns whether the sidebar is open.
 * @see getSidebarPage
 */
export function isSidebarOpen(page: Page, extensionId: string): boolean {
  const match = findSidebarPage(page, extensionId);

  return match != null;
}

/**
 * Finds the Pixiebrix sidebar page/frame.
 *
 * NOTE: returns the sidebar found, not necessarily the one for the provided page.
 *
 * Automatically clicks "OK" on the dialog that appears if the sidebar requires a user gesture to open
 * This is a Page contained in the browser sidepanel window.
 *
 * @throws {Error} if the sidebar is not available or multiple pages have the sidebar open
 */
export async function getSidebarPage(
  page: Page,
  extensionId: string,
): Promise<Page> {
  let sidebarPage: Page | undefined;

  await page.bringToFront(); // Ensure the tab is active before interacting with the sidebar

  // The sidebar sometimes requires the user to interact with modal to open the sidebar via a user gesture
  const conditionallyPerformUserGesture = async () => {
    await page.getByRole("button", { name: "Open Sidebar" }).click();
    return findSidebarPage(page, extensionId);
  };

  await expect(async () => {
    sidebarPage = await Promise.race([
      conditionallyPerformUserGesture(),
      findSidebarPage(page, extensionId),
    ]);
    expect(sidebarPage).toBeDefined();
  }).toPass({ timeout: 5000 });

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion  -- checked above
  return sidebarPage!;
}

// Waits for the selection menu to be ready to use (listeners are created and at least one action is registered).
// see: https://github.com/pixiebrix/pixiebrix-extension/blob/5693a4db1c4f3411910ef9cf6a60f5a20c132761/src/contentScript/textSelectionMenu/selectionMenuController.tsx#L336
export async function waitForSelectionMenuReadiness(page: Page) {
  await expect(async () => {
    await expect(page.locator("html")).toHaveAttribute(
      "data-pb-selection-menu-ready",
    );
  }).toPass({ timeout: 5000 });
}

// Waits for the snippet shortcut menu to be ready to use (listeners are created and at least one action is registered).
// see: https://github.com/pixiebrix/pixiebrix-extension/blob/c295c6c99b4851c9a52807ac5199b36789d62824/src/contentScript/snippetShortcutMenu/snippetShortcutMenuController.tsx#L378
export async function waitForSnippetShortcutMenuReadiness(page: Page) {
  await expect(async () => {
    await expect(page.locator("html")).toHaveAttribute(
      "data-pb-snippet-shortcut-menu-ready",
    );
  }).toPass({ timeout: 5000 });
}

// Waits for the quick bar to be ready to use
async function waitForQuickBarReadiness(page: Page) {
  await expect(async () => {
    await expect(page.locator("html")).toHaveAttribute(
      "data-pb-quick-bar-ready",
    );
  }).toPass({ timeout: 5000 });
}

/**
 * Returns a reference to the new page that was opened.
 * @param locator The anchor or button that opens the new page (must be clickable)
 * @param context The browser context
 */
export async function clickAndWaitForNewPage(
  locator: Locator,
  context: BrowserContext,
): Promise<Page> {
  const pagePromise = context.waitForEvent("page");

  await locator.click();

  return pagePromise;
}

type OSName = "Windows" | "MacOS" | "Unix" | "Linux" | "Unknown";

// Temporary workaround for determining which modifiers to use for keyboard shortcuts
// A permanent fix has been merged but not released
// See: https://github.com/microsoft/playwright/pull/30572
export async function getBrowserOs(page: Page): Promise<OSName> {
  let OSName: OSName = "Unknown";

  const response = String(await page.evaluate(() => navigator.userAgent));

  if (response.includes("Win")) {
    OSName = "Windows";
  }

  if (response.includes("Mac")) {
    OSName = "MacOS";
  }

  if (response.includes("X11")) {
    OSName = "Unix";
  }

  if (response.includes("Linux")) {
    OSName = "Linux";
  }

  return OSName;
}

export async function getModifierKey(page: Page): Promise<string> {
  const OSName = await getBrowserOs(page);
  return OSName === "MacOS" ? "Meta" : "Control";
}

export async function getModifierSymbol(page: Page): Promise<string> {
  const OSName = await getBrowserOs(page);
  return OSName === "MacOS" ? "⌘" : "⌃";
}

export function generateOTP(secret: string) {
  const totp = new TOTP({
    secret,
    digits: 6,
    algorithm: "sha1",
    period: 30,
  });

  return totp.generate();
}

export function isMsEdge(chromiumChannel: SupportedChannel): boolean {
  return [SupportedChannels.MSEDGE, SupportedChannels.MSEDGE_BETA].includes(
    chromiumChannel,
  );
}

export function isChrome(chromiumChannel: SupportedChannel): boolean {
  return [SupportedChannels.CHROME, SupportedChannels.CHROME_BETA].includes(
    chromiumChannel,
  );
}

export function isChromium(chromiumChannel: SupportedChannel): boolean {
  return chromiumChannel === SupportedChannels.CHROMIUM;
}
