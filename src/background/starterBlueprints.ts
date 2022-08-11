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
import { BlueprintResponse, Me } from "@/types/contract";
import { maybeGetLinkedApiClient } from "@/services/apiClient";
import { loadOptions } from "@/store/extensionsStorage";
import { RecipeDefinition } from "@/types/definitions";
import { pick } from "lodash";

const { reducer, actions } = extensionsSlice;
// TODO: replace me with the actual playground blueprint id
const PLAYGROUND_BLUEPRINT_NAME = "google/template-search";

async function installPlaygroundBlueprint(): Promise<void> {
  // 1. Make a call to the `me` endpoint to see if the user has a falsey preinstalledBlueprints flag
  const client = await maybeGetLinkedApiClient();
  if (client == null) {
    console.debug(
      "Skipping starter blueprint installation because the extension is not linked to the PixieBrix service"
    );
    return;
  }

  const { data: profile, status: profileResponseStatus } = await client.get<Me>(
    "/api/me/"
  );

  console.log(profile);

  // 2. If not, fetch the Playground blueprint
  if (!profile.install_starter_blueprints) {
    return;
  }

  const { data: playground_blueprint } = await client.get<BlueprintResponse>(
    `/api/recipes/${PLAYGROUND_BLUEPRINT_NAME}`
  );

  console.log("playground blueprint", playground_blueprint);
  // 3. Install this blueprint via extensionsSlice.actions.installRecipe

  if (!playground_blueprint) {
    return;
  }

  // Reshape to recipe definition
  const recipeDefinition: RecipeDefinition | null = {
    ...playground_blueprint.config,
    ...pick(playground_blueprint, ["sharing", "updated_at"]),
  };

  const state = await loadOptions();
  const result = reducer(
    state,
    actions.installRecipe({
      recipe: recipeDefinition,
      extensionPoints: playground_blueprint.config.extensionPoints,
    })
  );

  console.log("result", result);

  // 4. If successful, make a call to the preinstallBlueprints flag endpoint to mark the
  // preinstalledBlueprints flag
}

function initStarterBlueprints(): void {
  void installPlaygroundBlueprint();
}

export default initStarterBlueprints;
