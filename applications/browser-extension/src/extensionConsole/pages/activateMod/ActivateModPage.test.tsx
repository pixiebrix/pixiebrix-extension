/*
 * Copyright (C) 2024 PixieBrix, Inc.
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
import { render } from "../../testHelpers";
import { waitForEffect } from "@/testUtils/testHelpers";
import { screen, waitFor } from "@testing-library/react";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { appApiMock, mockAllApiEndpoints } from "@/testUtils/appApiMock";
import { validateRegistryId } from "@/types/helpers";
import { type RetrieveRecipeResponse } from "@/types/contract";
import {
  defaultModDefinitionFactory,
  modComponentDefinitionFactory,
} from "@/testUtils/factories/modDefinitionFactories";
import { metadataFactory } from "@/testUtils/factories/metadataFactory";
import useActivateMod, {
  type ActivateModFormCallback,
} from "@/activation/useActivateMod";
import { minimalSchemaFactory } from "@/utils/schemaUtils";
import ActivateModPage from "./ActivateModPage";
import { API_PATHS } from "@/data/service/urlPaths";
import { FeatureFlags } from "@/auth/featureFlags";

registerDefaultWidgets();

const testModId = validateRegistryId("@test/mod");

const activateModCallbackMock =
  // eslint-disable-next-line no-restricted-syntax -- TODO
  jest.fn() as jest.MockedFunction<ActivateModFormCallback>;

jest.mock("@/activation/useActivateMod.ts");

const activateModHookMock = jest.mocked(useActivateMod);

jest.mock("../useRegistryIdParam", () => ({
  __esModule: true,
  default: jest.fn(() => testModId),
}));

global.chrome.commands.getAll = jest.fn();

function setupMod(modDefinition: ModDefinition) {
  const modResponse: RetrieveRecipeResponse = {
    config: modDefinition,
    updated_at: modDefinition.updated_at,
    sharing: {
      public: false,
      organizations: [],
    },
  };

  appApiMock.onGet(API_PATHS.MOD(testModId)).reply(200, modResponse);
  mockAllApiEndpoints();
}

beforeEach(() => {
  appApiMock.reset();
  jest.clearAllMocks();
  activateModHookMock.mockReturnValue(activateModCallbackMock);
});

const ActivateModDefinitionPageWrapper: React.FC = () => (
  <MemoryRouter>
    <ActivateModPage />
  </MemoryRouter>
);

describe("ActivateModDefinitionPage", () => {
  test("renders", async () => {
    setupMod(defaultModDefinitionFactory());
    const { asFragment } = render(<ActivateModDefinitionPageWrapper />);
    await waitForEffect();
    expect(asFragment()).toMatchSnapshot();
  });

  test("renders successfully with undefined services property", async () => {
    setupMod(
      defaultModDefinitionFactory({
        extensionPoints: [
          modComponentDefinitionFactory({ services: undefined }),
        ],
      }),
    );
    const { asFragment } = render(<ActivateModDefinitionPageWrapper />);
    await waitForEffect();
    expect(asFragment()).toMatchSnapshot();
  });

  test("activate mod definition with missing required mod definition options", async () => {
    const modDefinition = defaultModDefinitionFactory({
      metadata: metadataFactory({
        id: validateRegistryId("test/blueprint-with-required-options"),
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
        modComponentDefinitionFactory({
          label: "Starter Brick for Mod with Required Options",
        }),
      ],
    });
    setupMod(modDefinition);

    const { asFragment } = render(<ActivateModDefinitionPageWrapper />);
    await waitForEffect();
    expect(asFragment()).toMatchSnapshot();
    await userEvent.click(screen.getByText("Activate"));
    expect(screen.getByText("Database is a required field")).not.toBeNull();
  });

  test("activate mod definition permissions", async () => {
    const modDefinition = defaultModDefinitionFactory({
      metadata: metadataFactory({
        id: validateRegistryId("test/blueprint-with-required-options"),
        name: "A Mod",
      }),
      extensionPoints: [
        modComponentDefinitionFactory({
          label: "A Starter Brick for Mod",
        }),
      ],
    });
    setupMod(modDefinition);

    const { asFragment } = render(<ActivateModDefinitionPageWrapper />);
    await waitForEffect();
    expect(asFragment()).toMatchSnapshot();
    await userEvent.click(screen.getByText("Activate"));

    await waitFor(() => {
      expect(activateModCallbackMock).toHaveBeenCalledWith(
        {
          optionsArgs: {},
          integrationDependencies: [],
          personalDeployment: false,
        },
        modDefinition,
      );
    });
  });

  test("activate mod with personal deployment enabled", async () => {
    const modDefinition = defaultModDefinitionFactory({
      metadata: metadataFactory({
        id: validateRegistryId("test/personal-deployment-mod"),
        name: "Personal Deployment Mod",
      }),
      extensionPoints: [
        modComponentDefinitionFactory({
          label: "Personal Deployment Mod Component",
        }),
      ],
    });

    appApiMock
      .onGet(API_PATHS.FEATURE_FLAGS)
      .reply(200, { flags: [FeatureFlags.MOD_PERSONAL_SYNC] });

    setupMod(modDefinition);

    const { container } = render(<ActivateModDefinitionPageWrapper />);

    await expect(
      screen.findByText("Synchronize Settings"),
    ).resolves.toBeInTheDocument();

    // eslint-disable-next-line testing-library/no-container, testing-library/no-node-access -- Boolean Widget needs a better selector
    await userEvent.click(container.querySelector(".switch")!);

    await userEvent.click(screen.getByText("Activate"));

    await waitFor(() => {
      expect(activateModCallbackMock).toHaveBeenCalledWith(
        {
          optionsArgs: {},
          integrationDependencies: [],
          personalDeployment: true,
        },
        modDefinition,
      );
    });
  });

  test("user reject permissions", async () => {
    activateModCallbackMock.mockResolvedValue({
      success: false,
      error: "You must accept browser permissions to activate",
    });

    const modDefinition = defaultModDefinitionFactory({
      metadata: metadataFactory({
        id: validateRegistryId("test/blueprint-with-required-options"),
        name: "A Mod",
      }),
      extensionPoints: [
        modComponentDefinitionFactory({
          label: "A Starter Brick for Mod",
        }),
      ],
    });
    setupMod(modDefinition);

    render(<ActivateModDefinitionPageWrapper />);
    await waitForEffect();
    await userEvent.click(screen.getByText("Activate"));

    await expect(
      screen.findByText("You must accept browser permissions to activate"),
    ).resolves.toBeVisible();
  });

  test("renders instructions", async () => {
    const mod = defaultModDefinitionFactory();
    mod.options = {
      schema: {
        ...minimalSchemaFactory(),
        description: "These are some instructions",
      },
    };
    setupMod(mod);
    const { asFragment } = render(<ActivateModDefinitionPageWrapper />);

    await expect(
      screen.findByText("These are some instructions"),
    ).resolves.toBeVisible();

    expect(asFragment()).toMatchSnapshot();
  });
});
