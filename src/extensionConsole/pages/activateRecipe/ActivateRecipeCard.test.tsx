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
import { render } from "@/extensionConsole/testHelpers";
import ActivateRecipeCard from "@/extensionConsole/pages/activateRecipe/ActivateRecipeCard";
import {
  extensionPointConfigFactory,
  recipeDefinitionFactory,
  recipeMetadataFactory,
} from "@/testUtils/factories";
import { waitForEffect } from "@/testUtils/testHelpers";
import { screen } from "@testing-library/react";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { type RegistryId } from "@/types/registryTypes";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { useGetRecipeQuery } from "@/services/api";
import { type RecipeDefinition } from "@/types/recipeTypes";

registerDefaultWidgets();

jest.mock("@/store/optionsStore", () => ({
  persistor: {
    flush: jest.fn(),
  },
}));

const installMock = jest.fn();

jest.mock("@/activation/useActivateRecipe.ts", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => installMock),
}));

jest.mock("@/services/api", () => ({
  useGetDatabasesQuery: jest.fn(() => ({
    data: [],
  })),
  useGetOrganizationsQuery: jest.fn(() => ({
    data: [],
  })),
  useCreateDatabaseMutation: jest.fn(() => [jest.fn()]),
  useAddDatabaseToGroupMutation: jest.fn(() => [jest.fn()]),
  useGetRecipeQuery: jest.fn(() => ({
    data: null,
  })),
  useCreateMilestoneMutation: jest.fn(() => [jest.fn()]),
  appApi: {
    useLazyGetMeQuery: jest.fn(() => [
      jest.fn(),
      {
        data: Object.freeze({}),
        isLoading: false,
      },
    ]),
  },
}));

jest.mock("@/extensionConsole/pages/pageHelpers", () => ({
  useRecipeIdParam: jest.fn().mockReturnValue("@test/recipe"),
}));

global.chrome.commands.getAll = jest.fn();

function setupRecipe(recipe: RecipeDefinition) {
  jest
    .mocked(useGetRecipeQuery)
    .mockReturnValue({ data: recipe, refetch: jest.fn() });
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ActivateRecipeCard", () => {
  test("renders", async () => {
    setupRecipe(recipeDefinitionFactory());
    const rendered = render(
      <MemoryRouter>
        <ActivateRecipeCard />
      </MemoryRouter>
    );
    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("activate recipe with missing required recipe options", async () => {
    const recipe = recipeDefinitionFactory({
      metadata: recipeMetadataFactory({
        id: "test/blueprint-with-required-options" as RegistryId,
        name: "Mod with Required Options",
      }),
      options: {
        schema: {
          $schema: "https://json-schema.org/draft/2019-09/schema#",
          properties: {
            database: {
              $ref: "https://app.pixiebrix.com/schemas/database#",
              title: "Database",
            },
          },
          required: ["database"],
          type: "object",
        },
        uiSchema: {},
      },
      extensionPoints: [
        extensionPointConfigFactory({
          label: "Extension Point for Mod with Required Options",
        }),
      ],
    });
    setupRecipe(recipe);

    const rendered = render(
      <MemoryRouter>
        <ActivateRecipeCard />
      </MemoryRouter>
    );
    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
    await userEvent.click(rendered.getByText("Activate"));
    expect(screen.getByText("Database is a required field")).not.toBeNull();
  });

  test("activate recipe permissions", async () => {
    const recipe = recipeDefinitionFactory({
      metadata: recipeMetadataFactory({
        id: "test/blueprint-with-required-options" as RegistryId,
        name: "A Mod",
      }),
      extensionPoints: [
        extensionPointConfigFactory({
          label: "A Extension Point for Mod",
        }),
      ],
    });
    setupRecipe(recipe);

    const rendered = render(
      <MemoryRouter>
        <ActivateRecipeCard />
      </MemoryRouter>
    );
    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
    await userEvent.click(rendered.getByText("Activate"));
    await waitForEffect();
    expect(installMock).toHaveBeenCalledWith(
      {
        extensions: { "0": true },
        optionsArgs: {},
        services: [],
      },
      recipe
    );
  });

  test("user reject permissions", async () => {
    jest.mocked(browser.permissions.request).mockResolvedValueOnce(false);

    const recipe = recipeDefinitionFactory({
      metadata: recipeMetadataFactory({
        id: "test/blueprint-with-required-options" as RegistryId,
        name: "A Mod",
      }),
      extensionPoints: [
        extensionPointConfigFactory({
          label: "A Extension Point for Mod",
        }),
      ],
    });
    setupRecipe(recipe);

    const rendered = render(
      <MemoryRouter>
        <ActivateRecipeCard />
      </MemoryRouter>
    );
    await waitForEffect();
    await userEvent.click(rendered.getByText("Activate"));
    await waitForEffect();
    expect(installMock).not.toHaveBeenCalled();
  });
});
