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

import { test, expect } from "../../fixtures/testBase";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";
import { ActivateModPage } from "../../pageObjects/extensionConsole/modsPage";

test("nunjucks template execution in sandbox", async ({
  page,
  extensionId,
}) => {
  // This is a simple mod that window alerts the rendered nunjucks template - {{ @input.title + " has loaded" }} on load
  // and window alerts {{ @input.title + "h1 has been clicked" }} when the h1 element is clicked
  const modId = "@e2e-testing/sandbox-execution-test";

  const modActivationPage = new ActivateModPage(page, extensionId, modId);
  await modActivationPage.goto();

  await modActivationPage.clickActivateAndWaitForModsPageRedirect();

  await test.step("Navigate to test site, and verify the nunjucks template is rendered for window alert", async () => {
    await page.goto("/");

    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Files within / is done loading" }),
    ).toBeVisible();
  });

  await test.step("Verify that the iframe is re-injected if it is removed", async () => {
    await page.evaluate(() => {
      const pbSandbox = document.querySelector("#pixiebrix-sandbox");
      pbSandbox?.remove();
    });

    await page.getByRole("heading").click();

    await expect(
      page
        .getByRole("status")
        .filter({ hasText: "Files within / h1 has been clicked" }),
    ).toBeVisible();
  });

  await test.step("Verify that we display an error if we continue to fail to inject iframe", async () => {
    await page.evaluate(() => {
      // Remove the sandbox again
      const pbSandbox = document.querySelector("#pixiebrix-sandbox");
      pbSandbox?.remove();
      // And set up Observer to watch for sandbox injection to remove it every time it is injected
      const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            if (
              node instanceof HTMLElement &&
              node.id === "pixiebrix-sandbox"
            ) {
              node.remove();
            }
          }
        }
      });
      observer.observe(document, { childList: true, subtree: true });
    });

    await page.getByRole("heading").click();

    await expect(
      page.getByRole("status").filter({
        hasText: "Failed to send message RENDER_NUNJUCKS to sandbox.",
      }),
    ).toBeVisible();
  });
});
