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

const testModName = "simple-sidebar-panel";
test.use({ modDefinitionNames: [testModName] });

test("can create a new mod from a yaml definition and update it", async ({
  page,
  extensionId,
  modDefinitionsMap,
  verifyModDefinitionSnapshot,
}) => {
  // Test uses the modDefinitionNames fixture to automatically create the mod definition
  const { id } = modDefinitionsMap[testModName]!;

  const workshopPage = new WorkshopPage(page, extensionId);
  await workshopPage.goto();
  const editWorkshopModPage = await workshopPage.findAndSelectMod(id);

  await expect(editWorkshopModPage.editor.root).toContainText(id);

  await verifyModDefinitionSnapshot({
    modId: id,
    snapshotName: "no-changes",
  });

  await editWorkshopModPage.editor.findAndReplaceText(
    "Created with the PixieBrix Page Editor",
    "Created in end to end tests",
  );
  await editWorkshopModPage.updateBrick();

  await verifyModDefinitionSnapshot({
    modId: id,
    snapshotName: "description-change",
  });

  await editWorkshopModPage.editor.findAndReplaceText(
    "heading: Simple Sidebar Panel",
    "heading: Simple Sidebar Panel -- Updated",
  );
  await editWorkshopModPage.updateBrick();

  await verifyModDefinitionSnapshot({
    modId: id,
    snapshotName: "heading-change",
  });

  await verifyModDefinitionSnapshot({
    modId: id,
    snapshotName: "final-definition",
    mode: "current",
  });
});
