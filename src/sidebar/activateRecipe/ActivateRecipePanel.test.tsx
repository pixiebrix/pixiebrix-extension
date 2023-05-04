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
import { useRequiredRecipe } from "@/recipes/recipesHooks";
import * as api from "@/services/api";
import { useGetMarketplaceListingsQuery } from "@/services/api";
import {
  getRecipeWithBuiltInServiceAuths,
  marketplaceListingFactory,
  recipeDefinitionFactory,
  recipeToMarketplacePackage,
  sidebarEntryFactory,
} from "@/testUtils/factories";
import { render } from "@/sidebar/testHelpers";
import ActivateRecipePanel from "@/sidebar/activateRecipe/ActivateRecipePanel";
import sidebarSlice from "@/sidebar/sidebarSlice";
import { waitForEffect } from "@/testUtils/testHelpers";
import { propertiesToSchema } from "@/validators/generic";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import useQuickbarShortcut from "@/hooks/useQuickbarShortcut";
import { type RecipeDefinition } from "@/types/recipeTypes";
import { containsPermissions } from "@/background/messenger/api";
import includesQuickBarExtensionPoint from "@/utils/includesQuickBarExtensionPoint";
import { valueToAsyncCacheState } from "@/utils/asyncStateUtils";
import { validateRegistryId } from "@/types/helpers";
import {
  queryLoadingFactory,
  querySuccessFactory,
} from "@/testUtils/rtkQueryFactories";

jest.mock("@/recipes/recipesHooks", () => ({
  useRequiredRecipe: jest.fn(),
}));

const useRequiredRecipeMock = useRequiredRecipe as jest.MockedFunction<
  typeof useRequiredRecipe
>;

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

jest.mock("@/utils/includesQuickBarExtensionPoint", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

const includesQuickBarMock =
  includesQuickBarExtensionPoint as jest.MockedFunction<
    typeof includesQuickBarExtensionPoint
  >;

jest.mock("@/background/messenger/api", () => ({
  containsPermissions: jest.fn(),
}));

const containsPermissionsMock = containsPermissions as jest.MockedFunction<
  typeof containsPermissions
>;

function setNeedsPermissions(needsPermissions: boolean) {
  containsPermissionsMock.mockResolvedValue(!needsPermissions);
}

jest.mock("@/registry/internal", () => ({
  // We're also mocking all the functions that this output is passed to, so we can return empty array
  resolveRecipe: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/hooks/useQuickbarShortcut", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("@/sidebar/activateRecipe/useMarketplaceActivateRecipe", () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue(async () => ({ success: true })),
}));

const useQuickbarShortcutMock = useQuickbarShortcut as jest.MockedFunction<
  typeof useQuickbarShortcut
>;

beforeAll(() => {
  registerDefaultWidgets();
});

function setupMocksAndRender(recipeOverride?: Partial<RecipeDefinition>) {
  const recipe = recipeDefinitionFactory({
    ...recipeOverride,
    metadata: {
      id: validateRegistryId("test-recipe"),
      name: "Test Mod",
    },
  });
  useRequiredRecipeMock.mockReturnValue(valueToAsyncCacheState(recipe));
  const listing = marketplaceListingFactory({
    // Consistent user-visible name for snapshots
    package: recipeToMarketplacePackage(recipe),
  });
  useGetMarketplaceListingsQueryMock.mockReturnValue(
    querySuccessFactory({
      [listing.package.name]: listing,
    })
  );
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
  setNeedsPermissions(false);
  useQuickbarShortcutMock.mockReturnValue({
    shortcut: null,
    isConfigured: false,
  });

  (api.useGetServiceAuthsQuery as jest.Mock).mockReturnValue(
    querySuccessFactory([])
  );
});

describe("ActivateRecipePanel", () => {
  test("it renders with options, permissions info", async () => {
    setNeedsPermissions(true);

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

    rendered.debug();

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

  test("it renders well-done page for quick bar mod shortcut is configured on MacOS", async () => {
    includesQuickBarMock.mockResolvedValue(true);

    useQuickbarShortcutMock.mockReturnValue({
      shortcut: "⌘M",
      isConfigured: true,
    });

    const rendered = setupMocksAndRender();

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("it renders well-done page for quick bar mod shortcut is configured on Windows", async () => {
    includesQuickBarMock.mockResolvedValue(true);

    useQuickbarShortcutMock.mockReturnValue({
      shortcut: "Ctrl+M",
      isConfigured: true,
    });

    const rendered = setupMocksAndRender();

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("it renders with service configuration if no built-in service configs available", async () => {
    const { recipe } = getRecipeWithBuiltInServiceAuths();

    (api.useGetServicesQuery as jest.Mock).mockReturnValue(
      querySuccessFactory([])
    );

    const rendered = setupMocksAndRender(recipe);

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("it activates recipe with built-in services automatically and renders well-done page", async () => {
    const { recipe, builtInServiceAuths } = getRecipeWithBuiltInServiceAuths();

    (api.useGetServiceAuthsQuery as jest.Mock).mockReturnValue(
      querySuccessFactory(builtInServiceAuths)
    );

    const rendered = setupMocksAndRender(recipe);

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("it doesn't flicker while built-in auths are loading", async () => {
    const { recipe } = getRecipeWithBuiltInServiceAuths();

    (api.useGetServiceAuthsQuery as jest.Mock).mockReturnValue(
      queryLoadingFactory()
    );

    const rendered = setupMocksAndRender(recipe);

    await waitForEffect();

    expect(rendered.getByTestId("loader")).not.toBeNull();
  });
});
