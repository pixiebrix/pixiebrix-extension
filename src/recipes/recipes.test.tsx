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

import React, { useEffect } from "react";
import { useAllRecipes } from "./recipesHooks";
import useSaveRecipe from "@/pageEditor/hooks/useSaveRecipe";
import { act, render } from "@/pageEditor/testHelpers";
import { validateSchema } from "@/options/pages/brickEditor/validate";
import { getApiClient, getLinkedApiClient } from "@/services/apiClient";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { registry as messengerRegistry } from "@/background/messenger/api";
import * as localRegistry from "@/registry/localRegistry";

jest.mock("@/services/apiClient", () => ({
  getApiClient: jest.fn(),
  getLinkedApiClient: jest.fn(),
}));
jest.mock("@/background/messenger/api", () => ({
  registry: {
    syncRemote: jest.fn(),
    getKind: jest.fn(),
  },
}));
jest.mock("@/components/ConfirmationModal", () => {
  const originalModule = jest.requireActual("@/components/ConfirmationModal");

  return {
    ...originalModule,
    useModals: () => ({
      showConfirmation: async () => Promise.resolve(true),
    }),
  };
});

// The test "loads" recipes from server and attempts to save the first (and the only) recipe
// It verifies the proper API calls and the recipe schema "sent" to the server
test("load recipes and save one", async () => {
  // This is the the shape of a recipe that we get from the API /api/recipes/ endpoint
  const sourceRecipe = {
    kind: "recipe",
    metadata: {
      id: "@pixies/confetti-everywhere",
      name: "Confetti double click",
      version: "1.0.2",
      description: "Double click to get confetti on any website",
    },
    apiVersion: "v2",
    definitions: {
      extensionPoint: {
        kind: "extensionPoint",
        definition: {
          type: "trigger",
          reader: [
            "@pixiebrix/document-metadata",
            {
              element: "@pixiebrix/html/element",
            },
          ],
          trigger: "dblclick",
          isAvailable: {
            selectors: [] as any,
            urlPatterns: [] as any,
            matchPatterns: ["*://*/*"],
          },
          rootSelector: "body",
        },
      },
    },
    extensionPoints: [
      {
        id: "extensionPoint",
        label: "Confetti double click",
        config: {
          action: [
            {
              id: "@pixiebrix/confetti",
              config: {},
            },
          ],
        },
        services: {},
      },
    ],
    sharing: {
      public: false,
      organizations: ["0557cdab-7246-4a73-a644-12a2249f02b9"],
    },
    updated_at: "2022-01-12T05:21:40.390064Z",
  };

  // This client is used by registry to fetch recipes: /api/recipes/
  (getApiClient as jest.Mock).mockResolvedValue({
    get: jest.fn().mockResolvedValue({ data: [sourceRecipe] }),
  });

  const packageId = uuidv4();
  const recipeId = validateRegistryId(sourceRecipe.metadata.id);
  let resultRecipeSchema: any; // Holds the data that will be sent to the API

  // This linked client is used by the RTK Query hooks
  (getLinkedApiClient as jest.Mock).mockResolvedValue(
    async ({ url, method, data }: any) => {
      if (method === "get" && url === "/api/bricks/") {
        return {
          data: [
            {
              id: packageId,
              name: recipeId,
            },
          ],
        };
      }

      if (method === "put" && url === `api/bricks/${packageId}/`) {
        resultRecipeSchema = data;
        return {
          data,
        };
      }
    }
  );

  (messengerRegistry.syncRemote as jest.Mock).mockImplementation(
    localRegistry.syncRemote
  );
  (messengerRegistry.getKind as jest.Mock).mockImplementation(
    localRegistry.getKind
  );

  let resolveFetchingSavingPromise: () => void;
  const fetchingSavingPromise = new Promise<void>((resolve) => {
    resolveFetchingSavingPromise = resolve;
  });

  const TestComponent: React.FunctionComponent = () => {
    // Internally useSaveRecipe calls useAllRecipes.
    // To make it more transparent and realistic we use useAllRecipes here
    // The hook will:
    // - load the recipes from server
    // - parse the raw recipes and save them to the registry (local storage)
    // - return all the recipes from the registry to the caller
    const {
      data: allRecipes,
      isFetchingFromCache: isFetchingRecipesFromCache,
      isFetching: isFetchingAllRecipes,
    } = useAllRecipes();

    const isFetching = isFetchingRecipesFromCache || isFetchingAllRecipes;

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
        resolveFetchingSavingPromise();
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
  await act(async () => fetchingSavingPromise);

  // 2 calls:
  // - one to load the recipes from the server
  // - one to re-load the recipes after update
  const apiClientMock = await getApiClient();
  expect(apiClientMock.get as jest.Mock).toHaveBeenCalledTimes(2);

  // 3 calls:
  // - one for editable packages,
  // - one for updating the recipe,
  // - and one to refetch the editable packages (because the cache is stale after update)
  expect(getLinkedApiClient as jest.Mock).toHaveBeenCalledTimes(3);

  // Validate the recipe config sent to server
  const validationResult = await validateSchema(resultRecipeSchema.config);
  expect(validationResult).toEqual({});
});
