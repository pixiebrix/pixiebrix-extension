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
import { WorkshopPage } from "../../pageObjects/extensionConsole/workshop/workshopPage";

test.use({ modDefinitionNames: ["simple-sidebar-panel"] });

test("can create a new mod from a yaml definition", async ({
  page,
  extensionId,
  createdModIds,
  verifyModDefinitionSnapshot,
}) => {
  // Test uses the modDefinitionNames fixture to automatically create the mod definition
  const simpleSidebarModId = createdModIds[0];

  const workshopPage = new WorkshopPage(page, extensionId);
  await workshopPage.goto();
  const editWorkshopModPage =
    await workshopPage.findAndSelectMod(simpleSidebarModId);

  await expect(editWorkshopModPage.editor.root).toContainText(
    simpleSidebarModId,
  );

  await verifyModDefinitionSnapshot({
    modId: simpleSidebarModId,
    snapshotName: "simple-sidebar-panel",
  });
});
