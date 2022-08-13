/*
 * Copyright (C) 2022 PixieBrix, Inc.
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

import extensionsSlice from "@/store/extensionsSlice";
import { maybeGetLinkedApiClient } from "@/services/apiClient";
import { loadOptions, saveOptions } from "@/store/extensionsStorage";
import { RecipeDefinition } from "@/types/definitions";
import { forEachTab } from "@/background/util";
import { queueReactivateTab } from "@/contentScript/messenger/api";
import { ExtensionOptionsState } from "@/store/extensionsTypes";
import reportError from "@/telemetry/reportError";

const { reducer, actions } = extensionsSlice;

function installStarterBlueprint(
  state: ExtensionOptionsState,
  starterBlueprint: RecipeDefinition
): ExtensionOptionsState {
  return reducer(
    state,
    actions.installRecipe({
      recipe: starterBlueprint,
      extensionPoints: starterBlueprint.extensionPoints,
    })
  );
}

export async function installStarterBlueprints(): Promise<void> {
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping starter blueprint installation because the extension is not linked to the PixieBrix service"
    );
    return;
  }

  try {
    const { data: starterBlueprints } = await client.get<RecipeDefinition[]>(
      "/api/onboarding/starter-blueprints/"
    );

    void client.post("/api/onboarding/starter-blueprints/install/");

    if (starterBlueprints.length === 0) {
      return;
    }

    let extensionsState = await loadOptions();

    for (const starterBlueprint of starterBlueprints) {
      const blueprintAlreadyInstalled = extensionsState.extensions.some(
        (extension) => extension._recipe.id === starterBlueprint.metadata.id
      );

      if (!blueprintAlreadyInstalled) {
        extensionsState = installStarterBlueprint(
          extensionsState,
          starterBlueprint
        );
      }
    }

    await saveOptions(extensionsState);

    await forEachTab(queueReactivateTab);
    void browser.tabs.create({
      url: "https://www.pixiebrix.com/playground",
    });
  } catch (error) {
    reportError(error);
  }
}

function initStarterBlueprints(): void {
  void installStarterBlueprints();
}

export default initStarterBlueprints;
