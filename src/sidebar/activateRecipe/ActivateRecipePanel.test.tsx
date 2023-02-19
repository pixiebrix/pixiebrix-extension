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
  sidebarEntryFactory,
} from "@/testUtils/factories";
import { type UseCachedQueryResult } from "@/core";
import { uuidv4 } from "@/types/helpers";
import { render } from "@/sidebar/testHelpers";
import ActivateRecipePanel from "@/sidebar/activateRecipe/ActivateRecipePanel";
import sidebarSlice from "@/sidebar/sidebarSlice";
import { waitForEffect } from "@/testUtils/testHelpers";
import { propertiesToSchema } from "@/validators/generic";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";

jest.mock("@/recipes/recipesHooks", () => ({
  useRecipe: jest.fn(),
}));

const useRecipeMock = useRecipe as jest.MockedFunction<typeof useRecipe>;

jest.mock("@/services/api", () => ({
  useGetMarketplaceListingsQuery: jest.fn(),
  useGetDatabasesQuery: jest.fn().mockReturnValue({
    data: [],
    isLoadingDatabases: false,
  }),
  useGetOrganizationsQuery: jest.fn().mockReturnValue({
    data: [],
    isLoadingOrganizations: false,
  }),
  useCreateDatabaseMutation: jest.fn().mockReturnValue([jest.fn()]),
  useAddDatabaseToGroupMutation: jest.fn().mockReturnValue([jest.fn()]),
  appApi: {
    reducerPath: "appApi",
    endpoints: {
      getMarketplaceListings: {
        useQueryState: jest.fn(),
      },
    },
  },
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

jest.mock("@/permissions/index", () => ({
  collectPermissions: jest.fn().mockReturnValue({
    permissions: [],
    origins: [],
  }),
}));

jest.mock("@/background/messenger/api", () => ({
  containsPermissions: jest.fn().mockReturnValue(false),
}));

jest.mock("@/utils/includesQuickBarExtensionPoint", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

jest.mock("@/hooks/useQuickbarShortcut", () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue({
    shortcut: null,
    isConfigured: false,
  }),
}));

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

beforeAll(() => {
  registerDefaultWidgets();
});

describe("ActivateRecipePanel", () => {
  test("it renders with options, permissions info, and quick bar hotkey info", async () => {
    const recipe = recipeDefinitionFactory({
      options: {
        schema: propertiesToSchema({
          foo: {
            type: "string",
          },
          bar: {
            type: "number",
          },
          testDatabase: {
            $ref: "https://app.pixiebrix.com/schemas/database#",
            title: "Test Database",
          },
        }),
      },
    });
    useRecipeMock.mockReturnValue(getMockCacheResult(recipe));

    const listing = marketplaceListingFactory({
      package: {
        id: uuidv4(),
        name: recipe.metadata.id,
        kind: "recipe",
        description: "This is a test listing",
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
      data: {
        [listing.package.name]: listing,
      },
      isLoading: false,
      error: null,
      refetch: jest.fn(),
    });

    const entry = sidebarEntryFactory("activateRecipe", {
      recipeId: recipe.metadata.id,
      heading: "Activate Blueprint",
    });

    const rendered = render(
      <ActivateRecipePanel recipeId={recipe.metadata.id} />,
      {
        setupRedux(dispatch) {
          dispatch(sidebarSlice.actions.showActivateRecipe(entry));
        },
      }
    );

    await waitForEffect();

    // XXX: why is this expected to show "Quick Bar" configuration info message given that isConfigured
    // is mocked to "true"?
    expect(rendered.asFragment()).toMatchSnapshot();
  });
});
