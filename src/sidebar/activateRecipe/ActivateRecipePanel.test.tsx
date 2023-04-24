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
  getRecipeWithBuiltInServiceAuths,
  marketplaceListingFactory,
  recipeDefinitionFactory,
  sidebarEntryFactory,
} from "@/testUtils/factories";
import { type UseCachedQueryResult } from "@/types/sliceTypes";
import { uuidv4 } from "@/types/helpers";
import { render } from "@/sidebar/testHelpers";
import ActivateRecipePanel from "@/sidebar/activateRecipe/ActivateRecipePanel";
import sidebarSlice from "@/sidebar/sidebarSlice";
import { waitForEffect } from "@/testUtils/testHelpers";
import { propertiesToSchema } from "@/validators/generic";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import includesQuickBarExtensionPoint from "@/utils/includesQuickBarExtensionPoint";
import useQuickbarShortcut from "@/hooks/useQuickbarShortcut";
import { type RecipeDefinition } from "@/types/recipeTypes";
import * as api from "@/services/api";

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
  useGetServiceAuthsQuery: jest.fn().mockReturnValue({
    data: [],
    isLoading: false,
    isFetching: false,
  }),
  useGetServicesQuery: jest.fn().mockReturnValue({
    data: [],
    isLoading: false,
  }),
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

jest.mock("@/sidebar/store", () => ({
  persistor: {
    flush: jest.fn(),
  },
}));

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

jest.mock("@/sidebar/activateRecipe/useMarketplaceActivateRecipe", () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue(async () => ({ success: true })),
}));

jest.mock("@/utils/includesQuickBarExtensionPoint", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const includesQuickBarMock =
  includesQuickBarExtensionPoint as jest.MockedFunction<
    typeof includesQuickBarExtensionPoint
  >;

jest.mock("@/hooks/useQuickbarShortcut", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useQuickbarShortcutMock = useQuickbarShortcut as jest.MockedFunction<
  typeof useQuickbarShortcut
>;

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

function setupMocksAndRender(recipeOverride?: Partial<RecipeDefinition>) {
  const recipe = recipeDefinitionFactory(recipeOverride);
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
    heading: "Activate Mod",
  });

  return render(<ActivateRecipePanel recipeId={recipe.metadata.id} />, {
    setupRedux(dispatch) {
      dispatch(sidebarSlice.actions.showActivateRecipe(entry));
    },
  });
}

beforeEach(() => {
  includesQuickBarMock.mockResolvedValue(false);
  useQuickbarShortcutMock.mockReturnValue({
    shortcut: null,
    isConfigured: false,
  });

  (api.useGetServiceAuthsQuery as jest.Mock).mockReturnValue({
    data: [],
    isLoading: false,
    isFetching: false,
  });
});

describe("ActivateRecipePanel", () => {
  test("it renders with options, permissions info", async () => {
    const rendered = setupMocksAndRender({
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

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("it activates basic recipe automatically and renders well-done page", async () => {
    const rendered = setupMocksAndRender();

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("it renders well-done page for quick bar mod shortcut not configured", async () => {
    includesQuickBarMock.mockResolvedValue(true);

    const rendered = setupMocksAndRender();

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("it renders well-done page for quick bar mod shortcut is configured", async () => {
    includesQuickBarMock.mockResolvedValue(true);
    useQuickbarShortcutMock.mockReturnValue({
      shortcut: "⌘M",
      isConfigured: true,
    });

    const rendered = setupMocksAndRender();

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("it renders with service configuration if no built-in service configs available", async () => {
    const { recipe } = getRecipeWithBuiltInServiceAuths();

    (api.useGetServicesQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
    });

    const rendered = setupMocksAndRender(recipe);

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("it activates recipe with built-in services automatically and renders well-done page", async () => {
    const { recipe, builtInServiceAuths } = getRecipeWithBuiltInServiceAuths();

    (api.useGetServiceAuthsQuery as jest.Mock).mockReturnValue({
      data: builtInServiceAuths,
      isLoading: false,
    });

    const rendered = setupMocksAndRender(recipe);

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("it doesn't flicker while built-in auths are loading", async () => {
    const { recipe } = getRecipeWithBuiltInServiceAuths();

    (api.useGetServiceAuthsQuery as jest.Mock).mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: true,
    });

    const rendered = setupMocksAndRender(recipe);

    await waitForEffect();

    expect(rendered.getByTestId("loader")).not.toBeNull();
  });
});
