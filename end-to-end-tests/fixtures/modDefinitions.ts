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

import { expect } from "@playwright/test";
import { test as pageContextFixture } from "./pageContext";
import { WorkshopPage } from "../pageObjects/extensionConsole/workshop/workshopPage";

// Removes any uuids from the text
function normalize(string: string) {
  return string.replaceAll(
    // eslint-disable-next-line unicorn/better-regex -- more clear this way
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
    "00000000-0000-0000-0000-000000000000",
  );
}

export const test = pageContextFixture.extend<{
  // These should correspond 1-1 with the mod definition file names in the fixtures/modDefinitions directory
  modDefinitionNames: string[];
  createdModIds: string[];
  verifyModDefinitionSnapshot: (options: {
    modId: string;
    snapshotName: string;
  }) => Promise<void>;
}>({
  modDefinitionNames: [],
  createdModIds: [
    async ({ modDefinitionNames, page, extensionId }, use) => {
      const createdIds: string[] = [];
      if (modDefinitionNames.length > 0) {
        const workshopPage = new WorkshopPage(page, extensionId);
        for (const definition of modDefinitionNames) {
          await workshopPage.goto();
          const createdModId =
            await workshopPage.createNewModFromDefinition(definition);
          createdIds.push(createdModId);
        }
      }

      await use(createdIds);

      if (createdIds.length > 0) {
        const workshopPage = new WorkshopPage(page, extensionId);
        for (const id of createdIds) {
          await workshopPage.goto();
          await workshopPage.deletePackagedModByModId(id);
        }
      }
    },
    { auto: true },
  ],
  async verifyModDefinitionSnapshot({ page, extensionId }, use, testInfo) {
    // Overriding the snapshot suffix to avoid including the os name.
    testInfo.snapshotSuffix = `${testInfo.title}`;
    const _verifyModDefinitionSnapshot = async ({
      modId,
      snapshotName,
    }: {
      modId: string;
      snapshotName: string;
    }) => {
      const workshopPage = new WorkshopPage(page, extensionId);
      await workshopPage.goto();
      const editPage = await workshopPage.findAndSelectMod(modId);

      const normalizedModDefinitionYaml = normalize(
        await editPage.editor.getValue(),
      );
      expect(normalizedModDefinitionYaml).toMatchSnapshot(snapshotName);
    };

    await use(_verifyModDefinitionSnapshot);
  },
});
