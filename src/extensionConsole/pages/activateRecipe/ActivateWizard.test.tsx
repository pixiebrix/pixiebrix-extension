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
import ActivateWizard from "@/extensionConsole/pages/activateRecipe/ActivateWizard";
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
import useExtensionConsoleInstall from "@/extensionConsole/pages/blueprints/utils/useExtensionConsoleInstall";
import { ensureAllPermissions } from "@/permissions";

registerDefaultWidgets();

jest.mock("@/permissions", () => ({
  ensureAllPermissions: jest.fn(() => true),
  collectPermissions: jest.fn(),
}));

const ensureAllPermissionsMock = ensureAllPermissions as jest.MockedFunction<
  typeof ensureAllPermissions
>;

jest.mock("@/store/optionsStore", () => ({
  persistor: {
    flush: jest.fn(),
  },
}));

const installMock = jest.fn();

jest.mock(
  "@/extensionConsole/pages/blueprints/utils/useExtensionConsoleInstall",
  () => ({
    __esModule: true,
    default: jest.fn().mockImplementation(() => installMock),
  })
);

jest.mock("@/services/api", () => ({
  useGetMarketplaceListingsQuery: jest
    .fn()
    .mockReturnValue({ data: {}, isLoading: false }),
  useGetDatabasesQuery: jest.fn(() => ({
    data: [],
  })),
  useGetOrganizationsQuery: jest.fn(() => ({
    data: [],
  })),
  useCreateDatabaseMutation: jest.fn(() => [jest.fn()]),
  useAddDatabaseToGroupMutation: jest.fn(() => [jest.fn()]),
  useCreateMilestoneMutation: jest.fn(() => [jest.fn()]),
  useGetServiceAuthsQuery: jest
    .fn()
    .mockReturnValue({ data: [], isLoading: false }),
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

jest.mock("@/recipes/recipesHooks", () => ({
  useAllRecipes: jest.fn().mockReturnValue({ data: [] }),
}));

global.chrome.commands.getAll = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ActivateWizard", () => {
  test("renders", async () => {
    const rendered = render(
      <MemoryRouter>
        <ActivateWizard blueprint={recipeDefinitionFactory()} />
      </MemoryRouter>
    );
    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
  });

  test("activate blueprint with missing required blueprint options", async () => {
    const rendered = render(
      <MemoryRouter>
        <ActivateWizard
          blueprint={recipeDefinitionFactory({
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
          })}
        />
      </MemoryRouter>
    );
    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
    await userEvent.click(rendered.getByText("Activate"));
    expect(screen.getByText("Database is a required field")).not.toBeNull();
  });

  test("activate blueprint permissions", async () => {
    const blueprint = recipeDefinitionFactory({
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

    const rendered = render(
      <MemoryRouter>
        <ActivateWizard blueprint={blueprint} />
      </MemoryRouter>
    );
    await waitForEffect();
    expect(rendered.asFragment()).toMatchSnapshot();
    await userEvent.click(rendered.getByText("Activate"));
    await waitForEffect();
    expect(useExtensionConsoleInstall).toHaveBeenCalledWith(blueprint);

    expect(installMock).toHaveBeenCalledWith(
      {
        extensions: { "0": true },
        optionsArgs: {},
        services: [],
      },
      expect.toBeObject()
    );
  });

  test("user reject permissions", async () => {
    ensureAllPermissionsMock.mockResolvedValue(false);

    const blueprint = recipeDefinitionFactory({
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

    const rendered = render(
      <MemoryRouter>
        <ActivateWizard blueprint={blueprint} />
      </MemoryRouter>
    );
    await waitForEffect();
    await userEvent.click(rendered.getByText("Activate"));
    await waitForEffect();
    expect(useExtensionConsoleInstall).toHaveBeenCalledWith(blueprint);
    expect(installMock).not.toHaveBeenCalled();
  });
});
