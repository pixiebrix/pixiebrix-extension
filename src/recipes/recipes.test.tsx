/*
 * Copyright (C) 2023 PixieBrix, Inc.
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

import React, { useEffect } from "react";
import { useAllRecipes } from "./recipesHooks";
import useSaveRecipe from "@/pageEditor/hooks/useSaveRecipe";
import { act, render } from "@/pageEditor/testHelpers";
import { validateSchema } from "@/extensionConsole/pages/brickEditor/validate";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { registry as messengerRegistry } from "@/background/messenger/api";
import * as localRegistry from "@/registry/packageRegistry";
import pDefer from "p-defer";
import { defaultInitialValue } from "@/utils/asyncStateUtils";
import { appApiMock } from "@/testUtils/appApiMock";
import { modDefinitionFactory } from "@/testUtils/factories/recipeFactories";

jest.mock("@/components/ConfirmationModal", () => ({
  ...jest.requireActual("@/components/ConfirmationModal"),
  useModals: () => ({
    showConfirmation: jest.fn().mockResolvedValue(true),
  }),
}));

beforeAll(() => {
  appApiMock.reset();
});

// The test "loads" recipes from server and attempts to save the first (and the only) recipe
// It verifies the proper API calls and the recipe schema "sent" to the server
test("load recipes and save one", async () => {
  // This is the shape of a recipe that we get from the API /api/recipes/ endpoint
  const sourceRecipe = modDefinitionFactory();

  const packageId = uuidv4();
  const recipeId = validateRegistryId(sourceRecipe.metadata.id);
  let resultRecipeDefinition: any; // Holds the data that will be sent to the API

  appApiMock
    .onGet("/api/registry/bricks/")
    .reply(200, [sourceRecipe])
    .onGet("/api/bricks/")
    .reply(200, [
      {
        id: packageId,
        name: recipeId,
      },
    ])
    .onPut(`/api/bricks/${packageId}/`)
    .reply(({ data }) => {
      resultRecipeDefinition = JSON.parse(data as string);
      return [201, { data }];
    });

  // Pre-populate IDB with the recipe
  await localRegistry.syncPackages();

  // Sanity check that localRegistry.syncPackages fetches from server
  expect(appApiMock.history.get).toHaveLength(1);

  // Skip the messenger, and use the IDB registry directly
  jest
    .mocked(messengerRegistry.getByKinds)
    .mockImplementation(localRegistry.getByKinds);

  jest
    .mocked(messengerRegistry.syncRemote)
    .mockImplementation(localRegistry.syncPackages);

  const fetchingSavingPromise = pDefer<void>();

  const TestComponent: React.FunctionComponent = () => {
    // Internally useSaveRecipe calls useAllRecipes.
    // To make it more transparent and realistic we use useAllRecipes here
    // The hook will:
    // - load the recipes from server
    // - parse the raw recipes and save them to the registry (local storage)
    // - return all the recipes from the registry to the caller
    const { data: allRecipes, isFetching } = defaultInitialValue(
      useAllRecipes(),
      []
    );

    const { save: saveRecipe, isSaving: isSavingRecipe } = useSaveRecipe();

    // Track if saveRecipe has been called
    const calledSave = React.useRef(false);
    // Track if re-fetching of the recipes by the registry has been called
    const calledRefetch = React.useRef(false);

    if (!isFetching && allRecipes.length > 0 && !calledSave.current) {
      // The saveRecipe action involves
      // - preparing a recipe for saving
      // - calling RTK Query mutation
      // - saving the recipe to the server
      void saveRecipe(recipeId);
      calledSave.current = true;
    }

    useEffect(() => {
      if (calledSave.current && calledRefetch.current && !isFetching) {
        fetchingSavingPromise.resolve();
      }

      if (isFetching && calledSave.current) {
        calledRefetch.current = true;
      }
    }, [isFetching]);

    return (
      <div>
        {isFetching ? "Fetching" : "Not Fetching"}
        {`Got ${allRecipes.length} recipes`}
        {isSavingRecipe ? "Saving" : "Not Saving"}
        {calledSave.current ? "Called Save" : "Not Called Save"}
      </div>
    );
  };

  render(<TestComponent />);

  // Let the registry and the RTK Query to load and update a recipe
  await act(async () => fetchingSavingPromise.promise);

  expect(appApiMock.history.get.map((x) => x.url)).toEqual([
    "/api/registry/bricks/",
    "/api/bricks/",
    "/api/registry/bricks/",
    "/api/bricks/",
  ]);

  // Validate the recipe config sent to server
  const validationResult = await validateSchema(
    resultRecipeDefinition.config as string
  );
  expect(validationResult).toEqual({});
});
