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
import { useRequiredModDefinitions } from "@/modDefinitions/modDefinitionHooks";
import { render, screen } from "@/sidebar/testHelpers";
import ActivateModPanel from "@/sidebar/activateRecipe/ActivateModPanel";
import sidebarSlice from "@/sidebar/sidebarSlice";
import { waitForEffect } from "@/testUtils/testHelpers";
import { propertiesToSchema } from "@/validators/generic";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import useQuickbarShortcut from "@/hooks/useQuickbarShortcut";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { valueToAsyncCacheState } from "@/utils/asyncStateUtils";
import { validateRegistryId } from "@/types/helpers";
import { checkModDefinitionPermissions } from "@/modDefinitions/modDefinitionPermissionsHelpers";
import { appApiMock, onDeferredGet } from "@/testUtils/appApiMock";
import {
  getModDefinitionWithBuiltInIntegrationConfigs,
  defaultModDefinitionFactory,
  modComponentDefinitionFactory,
} from "@/testUtils/factories/modDefinitionFactories";
import { sidebarEntryFactory } from "@/testUtils/factories/sidebarEntryFactories";
import {
  marketplaceListingFactory,
  modDefinitionToMarketplacePackage,
} from "@/testUtils/factories/marketplaceFactories";
import * as messengerApi from "@/contentScript/messenger/api";
import ActivateMultipleModsPanel from "@/sidebar/activateRecipe/ActivateMultipleModsPanel";
import ErrorBoundary from "@/sidebar/SidebarErrorBoundary";
import { includesQuickBarStarterBrick } from "@/starterBricks/starterBrickModUtils";
import { SERVICES_BASE_SCHEMA_URL } from "@/integrations/util/makeServiceContextFromDependencies";

jest.mock("@/modDefinitions/modDefinitionHooks", () => ({
  useRequiredModDefinitions: jest.fn(),
}));

jest.mock("@/sidebar/sidebarSelectors", () => ({
  selectSidebarHasModPanels: jest.fn(),
}));

const useRequiredModDefinitionsMock = jest.mocked(useRequiredModDefinitions);
const checkModDefinitionPermissionsMock = jest.mocked(
  checkModDefinitionPermissions,
);
const hideSidebarSpy = jest.spyOn(messengerApi, "hideSidebar");

jest.mock("@/starterBricks/starterBrickModUtils", () => {
  const actualUtils = jest.requireActual(
    "@/starterBricks/starterBrickModUtils",
  );

  return {
    __esModule: true,
    ...actualUtils,
    includesQuickBarStarterBrick: jest.fn(),
  };
});

const includesQuickBarMock = jest.mocked(includesQuickBarStarterBrick);

jest.mock("@/registry/internal", () => ({
  // We're also mocking all the functions that this output is passed to, so we can return empty array
  resolveRecipe: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/hooks/useQuickbarShortcut", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useQuickbarShortcutMock = jest.mocked(useQuickbarShortcut);

jest.mock("@/activation/useActivateRecipe", () => ({
  __esModule: true,
  default: jest.fn().mockReturnValue(async () => ({ success: true })),
}));

beforeAll(() => {
  registerDefaultWidgets();
});

function setupMocksAndRender(
  modDefinitionOverride?: Partial<ModDefinition>,
  { componentOverride }: { componentOverride?: React.ReactElement } = {},
) {
  const modDefinition = defaultModDefinitionFactory({
    ...modDefinitionOverride,
    metadata: {
      id: validateRegistryId("test-mod"),
      name: "Test Mod",
    },
  });
  useRequiredModDefinitionsMock.mockReturnValue(
    valueToAsyncCacheState([modDefinition]),
  );
  const listing = marketplaceListingFactory({
    // Consistent user-visible name for snapshots
    package: modDefinitionToMarketplacePackage(modDefinition),
  });

  // Tests can override by calling before setupMocksAndRender
  appApiMock.onGet("/api/marketplace/listings/").reply(200, [listing]);
  appApiMock.onGet().reply(200, []);

  const entry = sidebarEntryFactory("activateMods", {
    modIds: [modDefinition.metadata.id],
    heading: "Activate Mod",
  });

  const element = componentOverride ?? (
    <ActivateModPanel modId={modDefinition.metadata.id} />
  );

  return render(element, {
    setupRedux(dispatch) {
      dispatch(sidebarSlice.actions.showModActivationPanel(entry));
    },
  });
}

beforeEach(() => {
  appApiMock.reset();
  hideSidebarSpy.mockReset();

  includesQuickBarMock.mockResolvedValue(false);

  useQuickbarShortcutMock.mockReturnValue({
    shortcut: null,
    isConfigured: false,
  });

  checkModDefinitionPermissionsMock.mockResolvedValue({
    hasPermissions: true,
    permissions: {},
  });
});

describe("ActivateRecipePanel", () => {
  it("renders with options, permissions info", async () => {
    jest.mocked(checkModDefinitionPermissions).mockResolvedValue({
      hasPermissions: false,
      permissions: { origins: ["https://newurl.com"] },
    });

    const { asFragment } = setupMocksAndRender({
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

    expect(asFragment()).toMatchSnapshot();
  });

  it("activates basic recipe automatically and renders well-done page", async () => {
    const { asFragment } = setupMocksAndRender();

    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  it("activates basic recipe with empty options structure automatically and renders well-done page", async () => {
    const { asFragment } = setupMocksAndRender({
      options: {
        schema: {},
      },
    });

    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  it("activates recipe with database preview automatically and renders well-done page", async () => {
    const { asFragment } = setupMocksAndRender({
      options: {
        schema: propertiesToSchema({
          testDatabase: {
            $ref: "https://app.pixiebrix.com/schemas/database#",
            title: "Database",
            format: "preview",
          },
        }),
      },
    });

    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  it("activates recipe with optional integration dependency automatically and renders well-done page", async () => {
    const serviceId1 = validateRegistryId("@pixiebrix/test-service1");
    setupMocksAndRender({
      extensionPoints: [
        modComponentDefinitionFactory({
          services: {
            properties: {
              service1: {
                $ref: `${SERVICES_BASE_SCHEMA_URL}${serviceId1}`,
              },
            },
            required: [],
          },
        }),
      ],
    });

    await waitForEffect();

    expect(screen.getByText("Well done", { exact: false })).toBeVisible();
    expect(screen.getByRole("button", { name: "Ok" })).toBeVisible();
  });

  it("does not activate recipe automatically when one integration is required and one is not", async () => {
    const serviceId1 = validateRegistryId("@pixiebrix/test-service1");
    const serviceId2 = validateRegistryId("@pixiebrix/test-service2");
    setupMocksAndRender({
      extensionPoints: [
        modComponentDefinitionFactory({
          services: {
            properties: {
              service1: {
                $ref: `${SERVICES_BASE_SCHEMA_URL}${serviceId1}`,
              },
              service2: {
                $ref: `${SERVICES_BASE_SCHEMA_URL}${serviceId2}`,
              },
            },
            required: ["service1"],
          },
        }),
      ],
    });

    await waitForEffect();

    expect(
      screen.getByText(
        "We're almost there. This mod has a few settings to configure before using.",
        { exact: false },
      ),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Finish Activating" }),
    ).toBeVisible();
  });

  it("renders well-done page for quick bar mod shortcut not configured", async () => {
    includesQuickBarMock.mockResolvedValue(true);

    const { asFragment } = setupMocksAndRender();

    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  it("renders well-done page for quick bar mod shortcut is configured on MacOS", async () => {
    includesQuickBarMock.mockResolvedValue(true);

    useQuickbarShortcutMock.mockReturnValue({
      shortcut: "⌘M",
      isConfigured: true,
    });

    const { asFragment } = setupMocksAndRender();

    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  it("renders well-done page for quick bar mod shortcut is configured on Windows", async () => {
    includesQuickBarMock.mockResolvedValue(true);

    useQuickbarShortcutMock.mockReturnValue({
      shortcut: "Ctrl+M",
      isConfigured: true,
    });

    const { asFragment } = setupMocksAndRender();

    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  it("renders with service configuration if no built-in service configs available", async () => {
    const { modDefinition } = getModDefinitionWithBuiltInIntegrationConfigs();

    const { asFragment, container } = setupMocksAndRender(modDefinition);

    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
    expect(
      // eslint-disable-next-line testing-library/no-container
      container.querySelector(".actionButton"),
    ).not.toBeDisabled();
  });

  it("activates recipe with built-in services automatically and renders well-done page", async () => {
    const { modDefinition, builtInIntegrationConfigs } =
      getModDefinitionWithBuiltInIntegrationConfigs();

    appApiMock
      .onGet("/api/services/shared/")
      .reply(200, builtInIntegrationConfigs);

    const { asFragment } = setupMocksAndRender(modDefinition);

    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  it("doesn't flicker while built-in auths are loading", async () => {
    const { modDefinition } = getModDefinitionWithBuiltInIntegrationConfigs();

    onDeferredGet("/api/services/shared/");

    setupMocksAndRender(modDefinition);

    await waitForEffect();

    expect(screen.getByTestId("loader")).not.toBeNull();
  });
});

describe("ActivateMultipleModsPanel", () => {
  it("automatically activates single mod", async () => {
    const { modDefinition, builtInIntegrationConfigs } =
      getModDefinitionWithBuiltInIntegrationConfigs();

    appApiMock
      .onGet("/api/services/shared/")
      .reply(200, builtInIntegrationConfigs);

    const { asFragment } = setupMocksAndRender(modDefinition, {
      componentOverride: (
        <ActivateMultipleModsPanel modIds={[modDefinition.metadata.id]} />
      ),
    });

    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  it("shows error if any mod requires configuration", async () => {
    const { modDefinition } = getModDefinitionWithBuiltInIntegrationConfigs();

    setupMocksAndRender(modDefinition, {
      componentOverride: (
        <ErrorBoundary>
          <ActivateMultipleModsPanel modIds={[modDefinition.metadata.id]} />
        </ErrorBoundary>
      ),
    });

    await waitForEffect();

    expect(
      screen.getByText(
        "One or more mods require configuration. Activate the mods individually to configure them.",
      ),
    ).toBeInTheDocument();
  });
});
