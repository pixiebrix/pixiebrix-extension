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
import { type RecipeDefinition } from "@/types/recipeTypes";
import { appApiMock } from "@/testUtils/appApiMock";
import { useGetRecipeQuery } from "@/services/api";
import AsyncStateGate from "@/components/AsyncStateGate";
import { validateRegistryId } from "@/types/helpers";
import { type RecipeResponse } from "@/types/contract";

registerDefaultWidgets();

// XXX: Fix this mock, getting a warning that an unhandled error was caught from submitForm() TypeError: Cannot
// destructure property 'success' of '(intermediate value)' as it is undefined
const installMock = jest.fn();
const testRecipeId = validateRegistryId("@test/recipe");

jest.mock("@/activation/useActivateRecipe.ts", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => installMock),
}));

jest.mock("@/extensionConsole/pages/useRecipeIdParam", () => ({
  __esModule: true,
  default: jest.fn(() => testRecipeId),
}));

global.chrome.commands.getAll = jest.fn();

function setupRecipe(recipe: RecipeDefinition) {
  const recipeResponse: RecipeResponse = {
    config: recipe,
    updated_at: recipe.updated_at,
    sharing: {
      public: false,
      organizations: [],
    },
  };

  appApiMock
    .onGet(`/api/recipes/${encodeURIComponent(testRecipeId)}/`)
    .reply(200, recipeResponse)
    // Databases, organizations, etc.
    .onGet()
    .reply(200, []);
}

beforeEach(() => {
  appApiMock.reset();
  jest.clearAllMocks();
});

// Activate Recipe Card is always rendered when the recipe has already been found
const RecipeCard: React.FC = () => {
  const recipeState = useGetRecipeQuery({
    recipeId: testRecipeId,
  });
  return (
    <MemoryRouter>
      <AsyncStateGate state={recipeState}>
        {() => <ActivateRecipeCard />}
      </AsyncStateGate>
    </MemoryRouter>
  );
};

describe("ActivateRecipeCard", () => {
  test("renders", async () => {
    setupRecipe(recipeDefinitionFactory());
    const rendered = render(<RecipeCard />);
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

    const rendered = render(<RecipeCard />);
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

    const rendered = render(<RecipeCard />);
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
    installMock.mockResolvedValue({
      success: false,
      error: "You must accept browser permissions to activate",
    });

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

    const rendered = render(<RecipeCard />);
    await waitForEffect();
    await userEvent.click(rendered.getByText("Activate"));
    await waitForEffect();

    expect(
      screen.getByText("You must accept browser permissions to activate")
    ).toBeVisible();
  });
});
