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

import React from "react";
import { useRecipe } from "@/recipes/recipesHooks";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import {
  marketplaceListingFactory,
  recipeDefinitionFactory,
} from "@/testUtils/factories";
import { UseCachedQueryResult } from "@/core";
import { uuidv4 } from "@/types/helpers";
import { render } from "@/sidebar/testHelpers";
import ActivateRecipePanel from "@/sidebar/activateRecipe/ActivateRecipePanel";
import sidebarSlice from "@/sidebar/sidebarSlice";
import { ActivateRecipeEntry } from "@/sidebar/types";
import { waitForEffect } from "@/testUtils/testHelpers";

jest.mock("@/recipes/recipesHooks", () => ({
  useRecipe: jest.fn(),
}));

const useRecipeMock = useRecipe as jest.MockedFunction<typeof useRecipe>;

jest.mock("@/services/api", () => ({
  useGetMarketplaceListingsQuery: jest.fn(),
}));

const useGetMarketplaceListingsQueryMock =
  useGetMarketplaceListingsQuery as jest.MockedFunction<
    typeof useGetMarketplaceListingsQuery
  >;

jest.mock("@/store/optionsStore", () => ({
  persistor: {
    flush: jest.fn(),
  },
}));

jest.mock("@/hooks/useQuickbarShortcut", () =>
  jest.fn().mockReturnValue({
    isConfigured: true,
  })
);

function getMockCacheResult<T>(data: T): UseCachedQueryResult<T> {
  return {
    data,
    isFetchingFromCache: false,
    isCacheUninitialized: false,
    isFetching: false,
    isLoading: false,
    isUninitialized: false,
    error: null,
    refetch: jest.fn(),
  };
}

describe("ActivateRecipePanel", () => {
  test("it renders with options", async () => {
    const recipe = recipeDefinitionFactory();
    useRecipeMock.mockReturnValue(getMockCacheResult(recipe));
    const listing = marketplaceListingFactory({
      package: {
        id: uuidv4(),
        name: recipe.metadata.id,
        kind: "recipe",
        description: "This is a test lising",
        verbose_name: "My Test Listing",
        config: {},
        author: {
          scope: "@testAuthor",
        },
        organization: {
          scope: "@testOrg",
        },
      },
    });
    useGetMarketplaceListingsQueryMock.mockReturnValue({
      data: [listing],
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const entry: ActivateRecipeEntry = {
      recipeId: recipe.metadata.id,
      heading: "Activate Blueprint",
    };

    const rendered = render(
      <ActivateRecipePanel recipeId={recipe.metadata.id} />,
      {
        setupRedux(dispatch) {
          dispatch(sidebarSlice.actions.showActivateRecipe(entry));
        },
      }
    );

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
