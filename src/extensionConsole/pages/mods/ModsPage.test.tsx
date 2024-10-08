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
import { render, screen } from "@/extensionConsole/testHelpers";
import ModsPage from "@/extensionConsole/pages/mods/ModsPage";
import modsPageSlice from "@/extensionConsole/pages/mods/modsPageSlice";
import userEvent from "@testing-library/user-event";
import { appApiMock } from "@/testUtils/appApiMock";
import { DeploymentsProvider } from "@/extensionConsole/pages/deployments/DeploymentsContext";
import useAutoDeploy from "@/extensionConsole/pages/deployments/useAutoDeploy";
import {
  useAllModDefinitions,
  useOptionalModDefinition,
} from "@/modDefinitions/modDefinitionHooks";
import {
  errorToAsyncCacheState,
  loadingAsyncCacheStateFactory,
  valueToAsyncCacheState,
} from "@/utils/asyncStateUtils";
import { API_PATHS } from "@/data/service/urlPaths";
import { MODS_PAGE_TABS } from "@/extensionConsole/pages/mods/ModsPageSidebar";
import { modDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { modMetadataFactory } from "@/testUtils/factories/modComponentFactories";
import { actions as modComponentActions } from "@/store/modComponents/modComponentSlice";
import useOnboarding from "@/extensionConsole/pages/mods/onboardingView/useOnboarding";

jest.mock("@/modDefinitions/modDefinitionHooks");
const useAllModDefinitionsMock = jest.mocked(useAllModDefinitions);
const useOptionalModDefinitionMock = jest.mocked(useOptionalModDefinition);

jest.mock("@/extensionConsole/pages/deployments/useAutoDeploy");
const useAutoDeployMock = jest.mocked(useAutoDeploy);

jest.mock("@/extensionConsole/pages/mods/onboardingView/useOnboarding");
const useOnboardingMock = jest.mocked(useOnboarding);

describe("ModsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAllModDefinitionsMock.mockReturnValue(valueToAsyncCacheState([]));
    useOptionalModDefinitionMock.mockReturnValue(
      valueToAsyncCacheState(undefined),
    );
    useAutoDeployMock.mockReturnValue({ isAutoDeploying: false });
    appApiMock.reset();
    appApiMock.onGet(API_PATHS.MARKETPLACE_LISTINGS).reply(200, []);
    appApiMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, {
      flags: [],
    });
    appApiMock.onGet(API_PATHS.BRICKS).reply(200, []);
    useOnboardingMock.mockReturnValue({
      onboardingType: "default",
      isLoading: false,
    });
  });

  it("renders loading state when mods are loading", async () => {
    useAllModDefinitionsMock.mockReturnValue(loadingAsyncCacheStateFactory());
    useOptionalModDefinitionMock.mockReturnValue(
      loadingAsyncCacheStateFactory(),
    );

    render(
      <DeploymentsProvider>
        <ModsPage />
      </DeploymentsProvider>,
      {
        setupRedux(dispatch) {
          dispatch(modsPageSlice.actions.setIsLoadingData(true));
        },
      },
    );

    expect(screen.getByTestId("loader")).toBeInTheDocument();
  });

  it("renders loading state when auto deploying", async () => {
    useAutoDeployMock.mockReturnValue({ isAutoDeploying: true });

    render(
      <DeploymentsProvider>
        <ModsPage />
      </DeploymentsProvider>,
    );

    expect(screen.getByTestId("loader")).toBeInTheDocument();
  });

  it("renders error state when mods fail to load", async () => {
    useAllModDefinitionsMock.mockReturnValue(
      errorToAsyncCacheState(new Error("Failed to load mods")),
    );

    render(
      <DeploymentsProvider>
        <ModsPage />
      </DeploymentsProvider>,
      {
        setupRedux(dispatch) {
          dispatch(modsPageSlice.actions.setIsLoadingData(false));
        },
      },
    );

    expect(screen.getByText("An error occurred")).toBeInTheDocument();
    expect(screen.getByText("Failed to load mods")).toBeInTheDocument();
  });

  it("renders error state when marketplace listings fail to load", async () => {
    appApiMock.onGet(API_PATHS.MARKETPLACE_LISTINGS).reply(500);

    render(
      <DeploymentsProvider>
        <ModsPage />
      </DeploymentsProvider>,
      {
        setupRedux(dispatch) {
          dispatch(modsPageSlice.actions.setIsLoadingData(false));
        },
      },
    );

    await expect(
      screen.findByText("An error occurred"),
    ).resolves.toBeInTheDocument();
    expect(screen.getByText("Internal Server Error")).toBeInTheDocument();
  });

  it("renders GetStartedView when tab key is active", async () => {
    render(
      <DeploymentsProvider>
        <ModsPage />
      </DeploymentsProvider>,
      {
        setupRedux(dispatch) {
          dispatch(modsPageSlice.actions.setIsLoadingData(false));
          dispatch(
            modsPageSlice.actions.setActiveTab(MODS_PAGE_TABS.getStarted),
          );
        },
      },
    );

    expect(
      screen.getByText("Welcome to the PixieBrix Extension Console"),
    ).toBeInTheDocument();
  });

  test("renders active mods when there are mods", async () => {
    const mod1 = modDefinitionFactory({
      metadata: modMetadataFactory({ name: "Test Mod 1" }),
    });
    const mod2 = modDefinitionFactory({
      metadata: modMetadataFactory({ name: "Test Mod 2" }),
    });
    const mod3 = modDefinitionFactory({
      metadata: modMetadataFactory({ name: "Test Mod 3" }),
    });

    useAllModDefinitionsMock.mockReturnValue(
      valueToAsyncCacheState([mod1, mod2, mod3]),
    );

    const unavailableMod = modDefinitionFactory({
      metadata: modMetadataFactory({ name: "Unavailable Test Mod" }),
    });

    render(
      <DeploymentsProvider>
        <ModsPage />
      </DeploymentsProvider>,
      {
        setupRedux(dispatch) {
          dispatch(
            modComponentActions.activateMod({
              modDefinition: mod1,
              screen: "extensionConsole",
              isReactivate: false,
            }),
          );
          dispatch(
            modComponentActions.activateMod({
              modDefinition: unavailableMod,
              screen: "extensionConsole",
              isReactivate: false,
            }),
          );
          dispatch(modsPageSlice.actions.setIsLoadingData(false));
        },
      },
    );

    expect(screen.getByText("Test Mod 1")).toBeInTheDocument();
    expect(screen.getByText("Unavailable Test Mod")).toBeInTheDocument();
  });

  test("renders EmptyView when there are no search results for the query", async () => {
    const mod1 = modDefinitionFactory({
      metadata: modMetadataFactory({ name: "Test Mod 1" }),
    });
    const mod2 = modDefinitionFactory({
      metadata: modMetadataFactory({ name: "Test Mod 2" }),
    });

    useAllModDefinitionsMock.mockReturnValue(
      valueToAsyncCacheState([mod1, mod2]),
    );

    render(
      <DeploymentsProvider>
        <ModsPage />
      </DeploymentsProvider>,
      {
        setupRedux(dispatch) {
          dispatch(
            modComponentActions.activateMod({
              modDefinition: mod1,
              screen: "extensionConsole",
              isReactivate: false,
            }),
          );
          dispatch(
            modComponentActions.activateMod({
              modDefinition: mod2,
              screen: "extensionConsole",
              isReactivate: false,
            }),
          );
        },
      },
    );

    const searchQuery = "query doesn't match any mods";
    const searchInput = screen.getByTestId("mod-search-input");

    await userEvent.type(searchInput, searchQuery);

    // Wait for the search query to take effect
    await expect(
      screen.findByText("No mods found"),
    ).resolves.toBeInTheDocument();

    expect(screen.queryByText("Test Mod 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Test Mod 2")).not.toBeInTheDocument();
  }, 10_000);

  test("renders OnboardingView when there are no mods and no search query", async () => {
    render(
      <DeploymentsProvider>
        <ModsPage />
      </DeploymentsProvider>,
      {
        setupRedux(dispatch) {
          dispatch(modsPageSlice.actions.setIsLoadingData(false));
        },
      },
    );

    expect(
      screen.getByRole("heading", {
        name: "Welcome to PixieBrix! Ready to get started?",
      }),
    ).toBeInTheDocument();
  });
});
