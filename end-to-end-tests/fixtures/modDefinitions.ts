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

import { test as pageContextFixture } from "./pageContext";
import { WorkshopPage } from "../pageObjects/extensionConsole/workshop/workshopPage";

export const test = pageContextFixture.extend<{
  // These should correspond 1-1 with the mod definition file names in the fixtures/modDefinitions directory
  modDefinitionNames: string[];
  createdModIds: string[];
}>({
  modDefinitionNames: [],
  createdModIds: [
    async ({ modDefinitionNames, page, extensionId }, use) => {
      let createdIds: string[] = [];
      if (modDefinitionNames.length > 0) {
        const workshopPage = new WorkshopPage(page, extensionId);
        for (const definition of modDefinitionNames) {
          // eslint-disable-next-line no-await-in-loop -- TODO disable
          await workshopPage.goto();
          const createdModId =
            // eslint-disable-next-line no-await-in-loop -- TODO disable
            await workshopPage.createNewBrickFromModDefinition(definition);
          createdIds.push(createdModId);
        }
      }

      await use(createdIds);

      if (createdIds.length > 0) {
        const workshopPage = new WorkshopPage(page, extensionId);
        for (const id of createdIds) {
          // eslint-disable-next-line no-await-in-loop -- TODO disable
          await workshopPage.goto();
          // eslint-disable-next-line no-await-in-loop -- TODO disable
          await workshopPage.deletePackagedModByModId(id);
        }
      }
    },
    { auto: true },
  ],
});
