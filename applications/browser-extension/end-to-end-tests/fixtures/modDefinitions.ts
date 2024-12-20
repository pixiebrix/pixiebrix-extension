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
import { createPatch } from "diff";
import { dumpBrickYaml, loadBrickYaml } from "@/runtime/brickYaml";

// The mod definitions are a map of mod names to their test metadata
type ModDefinitions = Record<
  string,
  { id: string; definition: string; autoCleanup: boolean }
>;

// Replaces any uuids in the text with a fixed value to make snapshots more stable
function normalizeUUIDs(string: string) {
  return string.replaceAll(
    // eslint-disable-next-line unicorn/better-regex -- more clear this way
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g,
    "00000000-0000-0000-0000-000000000000",
  );
}

export const test = pageContextFixture.extend<{
  /**
   * Returns a function that accepts a callback which is passed in a new workshopPage.
   * The page is closed after the callback is executed.
   * @param callback The callback to execute with the workshopPage.
   */
  withWorkshopPage: (
    callback: (workshopPage: WorkshopPage) => Promise<void>,
  ) => Promise<void>;
  /**
   * Names of the mod definitions to create and track in the test. These should correspond
   * 1-1 with the mod definition file names in the fixtures/modDefinitions directory.
   */
  modDefinitionNames: string[];
  /**
   * A map of mod names to their test metadata. This is used to track the mod definitions for
   * snapshot verifying them. These are updated each time a mod definition snapshot is verified.
   */
  modDefinitionsMap: ModDefinitions;
  /**
   * Verifies the current definition state of a mod. Each time this is called, the mod definition is updated
   * in the modDefinitions map fixture.
   * @param options.modId The mod id to verify the snapshot for.
   * @param options.snapshotName The name of the snapshot to verify against.
   * @param options.mode The mode to use for verifying the snapshot. `diff` will compare the current mod definition
   * to the last known state, while `current` will compare the whole current mod definition to the snapshot.
   * @param options.prevModId The previous mod id to compare the current mod definition against. If provided, this will
   * be used to lookup the snapshot to compare against. For example: comparing a copied mod to the original.
   */
  verifyModDefinitionSnapshot: (options: {
    modId: string;
    snapshotName: string;
    mode?: "diff" | "current";
    prevModId?: string;
  }) => Promise<void>;
}>({
  async withWorkshopPage({ extensionId, context }, use) {
    await use(
      async (callback: (workshopPage: WorkshopPage) => Promise<void>) => {
        const newPage = await context.newPage();
        const workshopPage = new WorkshopPage(newPage, extensionId);
        await workshopPage.goto();
        await callback(workshopPage);
        await newPage.close();
      },
    );
  },
  modDefinitionNames: [],
  modDefinitionsMap: [
    async ({ modDefinitionNames, withWorkshopPage }, use) => {
      const createdModDefinitions: ModDefinitions = {};
      if (modDefinitionNames.length > 0) {
        for (const name of modDefinitionNames) {
          await withWorkshopPage(async (workshopPage) => {
            const modMetadata =
              await workshopPage.createNewModFromDefinition(name);
            createdModDefinitions[name] = { ...modMetadata, autoCleanup: true };
          });
        }
      }

      await use(createdModDefinitions);

      if (Object.keys(createdModDefinitions).length > 0) {
        for (const { id, autoCleanup } of Object.values(
          createdModDefinitions,
        )) {
          if (autoCleanup) {
            await withWorkshopPage(async (workshopPage) => {
              await workshopPage.deleteModByModId(id);
            });
          }
        }
      }
    },
    { auto: true },
  ],
  async verifyModDefinitionSnapshot(
    { modDefinitionsMap, withWorkshopPage },
    use,
    testInfo,
  ) {
    // Overriding the snapshot suffix to avoid including the os name.
    testInfo.snapshotSuffix = `${testInfo.title}`;
    const _verifyModDefinitionSnapshot = async ({
      modId,
      snapshotName,
      mode = "diff",
      prevModId,
    }: {
      modId: string;
      snapshotName: string;
      mode?: "diff" | "current";
      prevModId?: string;
    }) => {
      await withWorkshopPage(async (workshopPage) => {
        const editPage = await workshopPage.findAndSelectMod(modId);
        const currentModDefinitionYaml = await editPage.editor.getValue();
        // See if this mod is being tracked in modDefinitions.
        const lastModDefinitionEntry = Object.entries(modDefinitionsMap).find(
          ([_name, { id }]) => {
            if (prevModId) {
              return id === prevModId;
            }

            return id === modId;
          },
        );

        if (mode === "diff") {
          if (!lastModDefinitionEntry) {
            throw new Error(
              `Mod definition for ${
                prevModId ?? modId
              } not found in modDefinitions. Cannot verify a diff. Use mode 'current' to get the baseline snapshot.`,
            );
          }

          const [
            modDefinitionName,
            { definition: lastModDefinition, autoCleanup },
          ] = lastModDefinitionEntry;

          const parsedCurrentModDefinitionYaml = loadBrickYaml(
            currentModDefinitionYaml,
          );
          const parsedLastModDefinitionYaml = loadBrickYaml(lastModDefinition);
          const yamlDiff = createPatch(
            snapshotName,
            normalizeUUIDs(
              dumpBrickYaml(parsedLastModDefinitionYaml, {
                indent: 2,
                sortKeys: true,
              }),
            ),
            normalizeUUIDs(
              dumpBrickYaml(parsedCurrentModDefinitionYaml, {
                indent: 2,
                sortKeys: true,
              }),
            ),
            undefined,
            undefined,
            { context: 40 },
          );

          expect(yamlDiff).toMatchSnapshot(snapshotName + ".diff");

          // Update the mod definition to the last known state
          modDefinitionsMap[modDefinitionName] = {
            id: modId,
            definition: currentModDefinitionYaml,
            autoCleanup,
          };
        } else {
          const normalizedModDefinitionYaml = normalizeUUIDs(
            currentModDefinitionYaml,
          );
          expect(normalizedModDefinitionYaml).toMatchSnapshot(
            snapshotName + ".yaml",
          );

          // Use the mod definition name to update the mod definition if it exists, otherwise fallback to the modId
          const name = lastModDefinitionEntry?.[0] ?? modId;
          const autoCleanup = Boolean(modDefinitionsMap[name]?.autoCleanup);
          modDefinitionsMap[name] = {
            id: modId,
            definition: currentModDefinitionYaml,
            autoCleanup,
          };
        }
      });
    };

    await use(_verifyModDefinitionSnapshot);
  },
});
