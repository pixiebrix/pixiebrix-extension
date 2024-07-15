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

import {
  ActivateModPage,
  ModsPage,
} from "../../pageObjects/extensionConsole/modsPage";
import { test, expect } from "../../fixtures/testBase";

// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { type Page, test as base } from "@playwright/test";
import type { PageEditorPage } from "../../pageObjects/pageEditor/pageEditorPage";

test("Restricted browser page", async ({
  page,
  newPageEditorPage,
  extensionId,
}) => {
  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());

  const modsPage = new ModsPage(page, extensionId);
  await modsPage.goto();

  await expect(
    pageEditorPage.getByText("Get started with PixieBrix"),
  ).toBeVisible();
});

test("Unavailable mod", async ({ page, extensionId, newPageEditorPage }) => {
  const modId = "@e2e-testing/googlecom-trigger";
  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();
  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await page.goto("/");
  const pageEditorPage = await newPageEditorPage(page.url());
  await pageEditorPage.modListingPanel
    .getModListItemByName("Google.com trigger")
    .click();
  const googleTriggerStarterBrick =
    pageEditorPage.modListingPanel.getModStarterBrick(
      "Google.com trigger",
      "Google.com trigger",
    );

  await expect(
    googleTriggerStarterBrick.getByRole("img", {
      name: "Not available on page",
    }),
  ).toBeVisible();
});

test("Page Editor reload", async ({ page, newPageEditorPage, extensionId }) => {
  await page.goto("/");
  const firstPageEditorPage = await newPageEditorPage(page.url());

  const newPage = await page.context().newPage();
  newPage.goto("/bootstrap-5");
  const secondPageEditorPage = await newPageEditorPage(page.url());

  await secondPageEditorPage.modListingPanel.addStarterBrick("Trigger");

  await expect(
    firstPageEditorPage.getByText(
      "There were changes made in a different instance of the Page Editor. Reload this Page Editor to sync the changes.",
    ),
  ).toBeVisible();
});
