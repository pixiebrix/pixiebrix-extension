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

import { test, expect } from "../../../fixtures/testBase";
import { ActivateModPage } from "../../../pageObjects/extensionConsole/modsPage";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { type Page, test as base } from "@playwright/test";
import { getSidebarPage, runModViaQuickBar } from "../../../utils";
import { SERVICE_URL } from "../../../env";

test("sidebar mod panels are persistent during navigation", async ({
  page,
  extensionId,
}) => {
  const modId = "@e2e-testing/test-sidebar-navigation";
  const modActivationPage = new ActivateModPage(page, extensionId, modId);

  await test.step("Activate the mod and open the sidebar for the pbx testing site", async () => {
    await modActivationPage.goto();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();
    await page.goto("/");
    await runModViaQuickBar(page, "Open Sidebar");
  });

  const sideBarPage = await getSidebarPage(page, extensionId); // Sidebar is a separate page

  // Define common locators
  const sidebar1Heading = sideBarPage.getByRole("heading", {
    name: "Sidebar 1",
  });
  const sidebar2Heading = sideBarPage.getByRole("heading", {
    name: "Sidebar 2",
  });
  const sidebar1Tab = sideBarPage.getByRole("tab", { name: "Test sidebar 1" });
  const sidebar2Tab = sideBarPage.getByRole("tab", { name: "Test sidebar 2" });
  const modsTab = sideBarPage.getByRole("tab", { name: "Mods" });
  const notesField = sideBarPage.getByRole("textbox", {
    name: "Example Notes Field",
  });
  const connectingOverlay2 = sideBarPage
    .getByLabel("Test sidebar 2")
    .getByText("Connecting to page");
  const closeOverlayButton = sideBarPage.getByRole("button", {
    name: "Close the unavailable panel",
  });

  await test.step("Check initial state of the sidebar", async () => {
    await expect(sidebar2Heading).toBeVisible();
    await expect(sidebar1Tab).toBeVisible();
    await expect(sidebar2Tab).toBeVisible();
    // The notes field in this mod defaults its value to the current url.
    await expect(notesField).toContainText("https://pbx.vercel.app/");
  });

  await test.step("Navigate to the 'advanced-fields' subpage", async () => {
    await notesField.fill("Something else"); // Change the notes field to check if it resets
    await page.getByRole("link", { name: "advanced-fields" }).click();
    await expect(sidebar2Heading).toBeVisible();
    await expect(sidebar1Tab).toBeVisible();
    await expect(sidebar2Tab).toBeVisible();
    await expect(notesField).toContainText(
      "https://pbx.vercel.app/advanced-fields/",
    ); // Navigation should reset the notes field to the new url
  });

  await test.step("Navigate to SERVICE_URL", async () => {
    await page.route(SERVICE_URL, async (route) => {
      // Expect the temporary connecting overlay to be visible while the mod panel is remounting after navigation.
      await expect(connectingOverlay2).toBeVisible();
      await route.continue();
    });

    await page.goto(SERVICE_URL);
    await expect(connectingOverlay2).toBeHidden();
    await expect(sidebar2Heading).toBeVisible();
    await expect(sidebar1Tab).toBeVisible();
    await expect(sidebar2Tab).toBeVisible();
    await expect(notesField).toContainText(SERVICE_URL);
  });

  // Sidebar 1 panel is not enabled for the app SERVICE_URL
  await test.step("Check unavailability of Sidebar 1", async () => {
    await sidebar1Tab.click();
    await expect(sidebar1Heading).toBeVisible();
    await expect(closeOverlayButton).toBeVisible();
    await closeOverlayButton.click();

    await expect(sidebar1Tab).toBeHidden();
    await expect(sidebar2Heading).toBeVisible();
  });

  await test.step("Reload the page", async () => {
    await page.reload();
    await expect(connectingOverlay2).toBeHidden();
    await expect(sidebar2Heading).toBeVisible();
    await expect(notesField).toContainText(SERVICE_URL);
  });

  await test.step("Navigate to a page where all mod sidebar panels are not enabled", async () => {
    await page
      .getByRole("link", { name: "PixieBrix, Inc." })
      .click({ timeout: 3000 });
    await expect(connectingOverlay2).toBeHidden();
    await expect(closeOverlayButton).toBeVisible();
    await closeOverlayButton.click();
    await expect(sidebar2Tab).toBeHidden();
    // When all mod sidebar panels are closed, the Mods tab should be visible
    await expect(modsTab).toBeVisible();
  });
});

const navigationMethods: Array<{
  name: string;
  navigationMethod: (page: Page) => Promise<void>;
}> = [
  {
    name: "refresh",
    async navigationMethod(page: Page) {
      await page.reload();
    },
  },
  {
    name: "back button",
    async navigationMethod(page: Page) {
      await page.goBack();
      await page.goBack();
    },
  },
  {
    name: "goto new page",
    async navigationMethod(page: Page) {
      await page.goto(SERVICE_URL);
    },
  },
];

// Helper method for checking that the sidebar panels are unavailable after a navigation method
async function checkUnavailibilityForNavigationMethod(
  page: Page,
  extensionId: string,
  navigationMethod: (page: Page) => Promise<void>,
) {
  await page.goto("/advanced-fields");
  await runModViaQuickBar(page, "Open form");

  const sideBarPage = await getSidebarPage(page, extensionId);
  // Set up close listener for sidebar page
  let sideBarPageClosed = false;
  sideBarPage.on("close", () => {
    sideBarPageClosed = true;
  });

  await expect(
    sideBarPage
      .frameLocator("iframe")
      .getByRole("heading", { name: "Example Form" }),
  ).toBeVisible();
  await expect(
    sideBarPage.getByRole("tab", { name: "Example form" }),
  ).toBeVisible();

  await runModViaQuickBar(page, "Open temp panel");
  await expect(
    sideBarPage.getByRole("heading", { name: "Example document" }),
  ).toBeVisible();
  await expect(
    sideBarPage.getByRole("tab", { name: "Example info" }),
  ).toBeVisible();

  // Click on "contentEditable" header, which updates the url to .../#contenteditable
  await page.getByRole("link", { name: "contentEditable" }).click();
  expect(page.url()).toBe(
    "https://pbx.vercel.app/advanced-fields/#contenteditable",
  );
  // Should not cause the temporary panel to become unavailable
  await expect(
    sideBarPage
      .getByLabel("Example Info")
      .getByText("Panel no longer available"),
  ).toBeHidden();

  await navigationMethod(page);

  await expect(
    sideBarPage
      .getByLabel("Example Info")
      .getByText("Panel no longer available"),
  ).toBeVisible();
  await sideBarPage
    .getByLabel("Example Info")
    .getByLabel("Close the unavailable panel")
    .click();
  await expect(
    sideBarPage.getByRole("tab", { name: "Example info" }),
  ).toBeHidden();

  // The unavailable overlay is still displayed for the form panel
  await expect(
    sideBarPage
      .getByLabel("Example form")
      .getByText("Panel no longer available"),
  ).toBeVisible();
  await sideBarPage
    .getByLabel("Example form")
    .getByLabel("Close the unavailable panel")
    .click();

  // Closing the last panel should close the sidebar
  await expect(() => {
    expect(sideBarPageClosed).toBe(true);
  }).toPass({ timeout: 5000 });
}

test("sidebar form and temporary panels are unavailable after navigation", async ({
  page,
  extensionId,
}) => {
  // This mod has two quickbar actions for opening a temporary panel and a form panel in the sidebar.
  const modId = "@e2e-testing/temp-panel-unavailable-on-navigation";

  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();

  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  // Prime the browser history with an initial navigation
  await page.goto(SERVICE_URL);

  for (const { navigationMethod, name } of navigationMethods) {
    await test.step(`Checking navigation method: ${name}`, async () => {
      await checkUnavailibilityForNavigationMethod(
        page,
        extensionId,
        navigationMethod,
      );
    });
  }
});
