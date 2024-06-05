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

import { test, expect } from "../../fixtures/extensionBase";
import { getSidebarPage } from "../../utils";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { type Page, test as base } from "@playwright/test";

/**
 * Convert an existing link element on the page into a mod activation link
 * @param page the page on which to run the script
 * @param selector the selector of the element to convert
 * @param nextUrl the url to which to redirect after activation
 */
const createActivationLink = async (
  page: Page,
  selector: string,
  nextUrl: string,
) => {
  await page.evaluate(
    ({ selector, nextUrl }: { selector: string; nextUrl: string }) => {
      const link = document.querySelector(selector);
      link.setAttribute(
        "href",
        `http://app.pixiebrix.com/activate?id=%40misha-holtz%2Freverse-gitlink&nextUrl=${nextUrl}`,
      );
    },
    { selector, nextUrl },
  );
};

test("initiates sidebar mod activation from activate url click", async ({
  page,
  extensionId,
}) => {
  await page.goto("/bootstrap-5");
  await createActivationLink(
    page,
    "a[href*='#alpha']",
    "https://www.pixiebrix.com/",
  );
  await page.getByText("Alpha").click();
  await page.waitForURL("https://app.pixiebrix.com/*");
  // Using page.waitforUrl below is not working as expected, so we use the following workaround
  await expect(() => {
    expect(page.url()).toBe("https://www.pixiebrix.com/");
  }).toPass({
    timeout: 5000,
  });

  const sidebarPage = await getSidebarPage(page, extensionId);
  const activateTab = sidebarPage.getByText("Activating");
  const modName = sidebarPage.getByText("Reverse GitLink");

  await expect(activateTab).toBeVisible();
  await expect(modName).toBeVisible();
});

test("does not redirect to non-pixiebrix domain", async ({
  page,
  extensionId,
}) => {
  const invalidRedirectUrl = "https://pbx.vercel.app/";
  await page.goto("/bootstrap-5");
  await createActivationLink(page, "a[href*='#alpha']", invalidRedirectUrl);
  await page.getByText("Alpha").click();
  await page.waitForURL("https://app.pixiebrix.com/*");
  // Using page.waitforUrl below is not working as expected, so we use the following workaround
  await expect(() => {
    expect(page.url()).toBe("https://www.pixiebrix.com/");
  }).toPass({
    timeout: 5000,
  });

  const sidebarPage = await getSidebarPage(page, extensionId);
  const activateTab = sidebarPage.getByText("Activating");
  const modName = sidebarPage.getByText("Reverse GitLink");

  await expect(activateTab).toBeVisible();
  await expect(modName).toBeVisible();
});
