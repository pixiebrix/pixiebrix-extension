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
import includesQuickBarExtensionPoint from "@/utils/includesQuickBarExtensionPoint";
import { valueToAsyncCacheState } from "@/utils/asyncStateUtils";
import { validateRegistryId } from "@/types/helpers";
import { checkModDefinitionPermissions } from "@/modDefinitions/modDefinitionPermissionsHelpers";
import { appApiMock, onDeferredGet } from "@/testUtils/appApiMock";
import {
  getModDefinitionWithBuiltInServiceAuths,
  defaultModDefinitionFactory,
} from "@/testUtils/factories/modDefinitionFactories";
import { sidebarEntryFactory } from "@/testUtils/factories/sidebarEntryFactories";
import {
  marketplaceListingFactory,
  recipeToMarketplacePackage,
} from "@/testUtils/factories/marketplaceFactories";
import * as messengerApi from "@/contentScript/messenger/api";
import { selectSidebarHasModPanels } from "@/sidebar/sidebarSelectors";
import userEvent from "@testing-library/user-event";
import ActivateMultipleModsPanel from "@/sidebar/activateRecipe/ActivateMultipleModsPanel";
import ErrorBoundary from "@/sidebar/ErrorBoundary";

jest.mock("@/modDefinitions/modDefinitionHooks", () => ({
  useRequiredModDefinitions: jest.fn(),
}));

jest.mock("@/sidebar/sidebarSelectors", () => ({
  selectSidebarHasModPanels: jest.fn(),
}));

const useRequiredModDefinitionsMock = jest.mocked(useRequiredModDefinitions);
const checkModDefinitionPermissionsMock = jest.mocked(
  checkModDefinitionPermissions
);
const selectSidebarHasModPanelsMock = jest.mocked(selectSidebarHasModPanels);
const hideSidebarSpy = jest.spyOn(messengerApi, "hideSidebar");

jest.mock("@/utils/includesQuickBarExtensionPoint", () => ({
  __esModule: true,
  default: jest.fn().mockResolvedValue(true),
}));

const includesQuickBarMock = jest.mocked(includesQuickBarExtensionPoint);

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
  { componentOverride }: { componentOverride?: React.ReactElement } = {}
) {
  const modDefinition = defaultModDefinitionFactory({
    ...modDefinitionOverride,
    metadata: {
      id: validateRegistryId("test-mod"),
      name: "Test Mod",
    },
  });
  useRequiredModDefinitionsMock.mockReturnValue(
    valueToAsyncCacheState([modDefinition])
  );
  const listing = marketplaceListingFactory({
    // Consistent user-visible name for snapshots
    package: recipeToMarketplacePackage(modDefinition),
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
  selectSidebarHasModPanelsMock.mockReset();
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

  it("activates basic recipe automatically and renders well-done page", async () => {
    const rendered = setupMocksAndRender();

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("activates basic recipe with empty options structure automatically and renders well-done page", async () => {
    const rendered = setupMocksAndRender({
      options: {
        schema: {},
      },
    });

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("activates recipe with database preview automatically and renders well-done page", async () => {
    const rendered = setupMocksAndRender({
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

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("renders well-done page for quick bar mod shortcut not configured", async () => {
    includesQuickBarMock.mockResolvedValue(true);

    const rendered = setupMocksAndRender();

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("renders well-done page for quick bar mod shortcut is configured on MacOS", async () => {
    includesQuickBarMock.mockResolvedValue(true);

    useQuickbarShortcutMock.mockReturnValue({
      shortcut: "⌘M",
      isConfigured: true,
    });

    const rendered = setupMocksAndRender();

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("renders well-done page for quick bar mod shortcut is configured on Windows", async () => {
    includesQuickBarMock.mockResolvedValue(true);

    useQuickbarShortcutMock.mockReturnValue({
      shortcut: "Ctrl+M",
      isConfigured: true,
    });

    const rendered = setupMocksAndRender();

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("renders with service configuration if no built-in service configs available", async () => {
    const { modDefinition } = getModDefinitionWithBuiltInServiceAuths();

    const rendered = setupMocksAndRender(modDefinition);

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
    expect(
      rendered.container.querySelector(".actionButton")
    ).not.toBeDisabled();
  });

  it("activates recipe with built-in services automatically and renders well-done page", async () => {
    const { modDefinition, builtInServiceAuths } =
      getModDefinitionWithBuiltInServiceAuths();

    appApiMock.onGet("/api/services/shared/").reply(200, builtInServiceAuths);

    const rendered = setupMocksAndRender(modDefinition);

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("doesn't flicker while built-in auths are loading", async () => {
    const { modDefinition } = getModDefinitionWithBuiltInServiceAuths();

    onDeferredGet("/api/services/shared/");

    const rendered = setupMocksAndRender(modDefinition);

    await waitForEffect();

    expect(rendered.getByTestId("loader")).not.toBeNull();
  });

  it("activating a mod closes the sidebar when there are no other mod panels to show", async () => {
    selectSidebarHasModPanelsMock.mockImplementation(() => false);

    setupMocksAndRender();
    await waitForEffect();

    await userEvent.click(screen.getByRole("button", { name: /ok/i }));

    expect(hideSidebarSpy).toHaveBeenCalledTimes(1);
  });

  it("activating a mod leaves the sidebar open when there are other mod panels to show", async () => {
    selectSidebarHasModPanelsMock.mockImplementation(() => true);

    setupMocksAndRender();
    await waitForEffect();

    await userEvent.click(screen.getByRole("button", { name: /ok/i }));

    expect(hideSidebarSpy).toHaveBeenCalledTimes(0);
  });
});

describe("ActivateMultipleModsPanel", () => {
  it("automatically activates single mod", async () => {
    const { modDefinition, builtInServiceAuths } =
      getModDefinitionWithBuiltInServiceAuths();

    appApiMock.onGet("/api/services/shared/").reply(200, builtInServiceAuths);

    const rendered = setupMocksAndRender(modDefinition, {
      componentOverride: (
        <ActivateMultipleModsPanel modIds={[modDefinition.metadata.id]} />
      ),
    });

    await waitForEffect();

    expect(rendered.asFragment()).toMatchSnapshot();
  });

  it("shows error if any mod requires configuration", async () => {
    const { modDefinition } = getModDefinitionWithBuiltInServiceAuths();

    setupMocksAndRender(modDefinition, {
      componentOverride: (
        <ErrorBoundary>
          <ActivateMultipleModsPanel modIds={[modDefinition.metadata.id]} />
        </ErrorBoundary>
      ),
    });

    await waitForEffect();

    expect(
      screen.queryByText(
        "One or more mods require configuration. Activate the mods individually to configure them."
      )
    ).toBeInTheDocument();
  });
});
