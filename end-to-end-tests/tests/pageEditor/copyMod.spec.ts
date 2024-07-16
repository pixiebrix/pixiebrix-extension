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

import { expect, test } from "../../fixtures/testBase";
// @ts-expect-error -- https://youtrack.jetbrains.com/issue/AQUA-711/Provide-a-run-configuration-for-Playwright-tests-in-specs-with-fixture-imports-only
import { test as base } from "@playwright/test";
import { ActivateModPage } from "../../pageObjects/extensionConsole/modsPage";
import { uuidv4 } from "@/types/helpers";

test("copying a mod that uses the PixieBrix API is copied correctly", async ({
  page,
  newPageEditorPage,
  extensionId,
  verifyModDefinitionSnapshot,
}) => {
  const modId = "@e2e-testing/test/write-to-db-static";
  const modName = "Write to Hard-Coded DB";
  const modUuid = uuidv4();
  const copyModId = `@extension-e2e-test-unaffiliated/write-to-hard-coded-db-${modUuid}`;

  await test.step("Activate the mod to be copied", async () => {
    const modActivationPage = new ActivateModPage(page, extensionId, modId);
    await modActivationPage.goto();
    await modActivationPage.clickActivateAndWaitForModsPageRedirect();

    await verifyModDefinitionSnapshot({
      modId,
      snapshotName: "write-to-db-static-origin",
      mode: "current",
    });
  });

  await test.step("Copy the mod", async () => {
    await page.goto("/");
    const pageEditorPage = await newPageEditorPage(page.url());
    await pageEditorPage.copyMod(modName, modUuid);

    await expect(
      pageEditorPage.getByRole("textbox", { name: "Mod ID" }),
    ).toHaveValue(copyModId);

    await expect(
      pageEditorPage.getByRole("textbox", { name: "Name" }),
    ).toHaveValue(`${modName} (Copy)`);
  });

  await verifyModDefinitionSnapshot({
    modId: copyModId,
    snapshotName: "write-to-db-static-copy",
    mode: "diff",
    prevModId: modId,
  });
});
