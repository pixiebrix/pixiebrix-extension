/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { screen, render } from "@testing-library/react";
import { _InstalledPage } from "./InstalledPage";
import { StaticRouter } from "react-router-dom";
import AuthContext from "@/auth/AuthContext";
import { Organization } from "@/types/contract";
import OnboardingPage from "@/options/pages/installed/OnboardingPage";

jest.mock("@/services/api", () => ({
  useGetOrganizationsQuery: jest.fn(),
  useGetRecipesQuery: jest.fn(),
}));

jest.mock("@/hooks/useDeployments", () => jest.fn());

import { useGetOrganizationsQuery, useGetRecipesQuery } from "@/services/api";
import useDeployments from "@/hooks/useDeployments";

// eslint-disable-next-line arrow-body-style -- better readability b/c it's returning a method
jest.mock("@/hooks/useNotifications", () => {
  // We're not asserting any specific calls yet, so just pass generic mocks
  return () => ({
    success: jest.fn(),
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    userError: jest.fn(),
  });
});

describe("InstalledPage", () => {
  afterAll(() => {
    jest.resetAllMocks();
  });

  jest.mock("@/hooks/common", () => ({
    useAsyncState: jest.fn().mockReturnValue([[], false, undefined, jest.fn()]),
  }));

  test("doesn't show ActiveBrick card when no extensions installed", () => {
    mockOnboarding();
    const { container } = render(
      <StaticRouter>
        <_InstalledPage extensions={[]} onRemove={jest.fn()} />
      </StaticRouter>
    );
    expect(container.querySelector(".ActiveBricksCard")).toBeNull();
  });
});

const mockOnboarding = ({
  hasOrganization = false,
  hasDeployments = false,
  hasTeamBlueprints = false,
}: {
  hasOrganization?: boolean;
  hasDeployments?: boolean;
  hasTeamBlueprints?: boolean;
} = {}) => {
  (useGetOrganizationsQuery as jest.Mock).mockImplementation(() => ({
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we only need organizations.length > 1
    data: hasOrganization ? [{} as Organization] : [],
  }));

  // eslint-disable-next-line arrow-body-style -- better readability b/c it's returning a method
  (useDeployments as jest.Mock).mockImplementation(() => {
    return {
      hasUpdate: hasDeployments,
      update: () => {},
      extensionUpdateRequired: false,
      isLoading: false,
      error: undefined as unknown,
    };
  });

  (useGetRecipesQuery as jest.Mock).mockImplementation(() => ({
    data: hasTeamBlueprints
      ? [
          {
            sharing: {
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we only need organizations.length > 1
              organizations: [{} as Organization],
            },
          },
        ]
      : [],
  }));
};

const mockOnboardingLoadingState = ({
  isOrganizationsLoading = false,
  isDeploymentsLoading = false,
  isTeamBlueprintsLoading = false,
}: {
  isOrganizationsLoading?: boolean;
  isDeploymentsLoading?: boolean;
  isTeamBlueprintsLoading?: boolean;
} = {}) => {
  (useGetOrganizationsQuery as jest.Mock).mockImplementation(() => ({
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we only need organizations.length > 1
    data: [{} as Organization],
    isLoading: isOrganizationsLoading,
  }));

  // eslint-disable-next-line arrow-body-style -- better readability b/c it's returning a method
  (useDeployments as jest.Mock).mockImplementation(() => {
    return {
      hasUpdate: true,
      update: () => {},
      extensionUpdateRequired: false,
      isLoading: isDeploymentsLoading,
      error: undefined as unknown,
    };
  });

  (useGetRecipesQuery as jest.Mock).mockImplementation(() => ({
    data: [
      {
        sharing: {
          // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- we only need organizations.length > 1
          organizations: [{} as Organization],
        },
      },
    ],
    isLoading: isTeamBlueprintsLoading,
  }));
};

const getRenderedOnboardingInformation = () => {
  const activateFromMarketplaceColumn = screen.queryByText(
    "Activate an Official Blueprint"
  );

  const contactTeamAdminColumn = screen.queryByText("Contact your team admin");

  const videoTour = screen.queryByText("Video Tour");

  const createBrickColumn = screen.queryByText("Create your Own");

  const activateFromDeploymentBannerColumn = screen.queryByText(
    "You have Team Bricks ready to activate!"
  );

  const activateTeamBlueprintsColumn = screen.queryByText(
    "Browse and activate team bricks"
  );

  return {
    activateFromMarketplaceColumn,
    createBrickColumn,
    contactTeamAdminColumn,
    videoTour,
    activateFromDeploymentBannerColumn,
    activateTeamBlueprintsColumn,
  };
};

describe("OnboardingPage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("typical user with no organization", () => {
    mockOnboarding();

    render(
      <StaticRouter>
        <OnboardingPage />
      </StaticRouter>
    );

    const rendered = getRenderedOnboardingInformation();

    expect(rendered.activateFromMarketplaceColumn).not.toBeNull();
    expect(rendered.createBrickColumn).not.toBeNull();
    expect(rendered.videoTour).not.toBeNull();
  });

  test("enterprise user with `restricted-marketplace` flag", () => {
    mockOnboarding({ hasOrganization: true });

    render(
      <AuthContext.Provider
        value={{
          flags: ["restricted-marketplace"],
          isLoggedIn: true,
          isOnboarded: true,
          extension: true,
        }}
      >
        <StaticRouter>
          <OnboardingPage />
        </StaticRouter>
      </AuthContext.Provider>
    );

    const rendered = getRenderedOnboardingInformation();

    expect(rendered.activateFromMarketplaceColumn).toBeNull();
    expect(rendered.contactTeamAdminColumn).not.toBeNull();
    expect(rendered.videoTour).toBeNull();
  });

  test("enterprise user with automatic team deployments", () => {
    mockOnboarding({
      hasOrganization: true,
      hasDeployments: true,
    });

    render(
      <AuthContext.Provider
        value={{
          flags: ["restricted-marketplace"],
          isLoggedIn: true,
          isOnboarded: true,
          extension: true,
        }}
      >
        <StaticRouter>
          <OnboardingPage />
        </StaticRouter>
      </AuthContext.Provider>
    );

    const rendered = getRenderedOnboardingInformation();

    expect(rendered.activateFromMarketplaceColumn).toBeNull();
    expect(rendered.activateFromDeploymentBannerColumn).not.toBeNull();
    expect(rendered.videoTour).toBeNull();
  });

  test("enterprise user with team blueprints", () => {
    mockOnboarding({
      hasOrganization: true,
      hasTeamBlueprints: true,
    });

    render(
      <StaticRouter>
        <OnboardingPage />
      </StaticRouter>
    );

    const rendered = getRenderedOnboardingInformation();

    expect(rendered.activateTeamBlueprintsColumn).toBeNull();
    expect(rendered.createBrickColumn).not.toBeNull();
    expect(rendered.videoTour).not.toBeNull();
  });

  test("enterprise user with no team blueprints or restrictions", () => {
    mockOnboarding({
      hasOrganization: true,
    });

    render(
      <StaticRouter>
        <OnboardingPage />
      </StaticRouter>
    );

    const rendered = getRenderedOnboardingInformation();

    expect(rendered.activateFromMarketplaceColumn).not.toBeNull();
    expect(rendered.createBrickColumn).not.toBeNull();
    expect(rendered.videoTour).not.toBeNull();
  });

  function expectLoading() {
    const { container } = render(
      <StaticRouter>
        <OnboardingPage />
      </StaticRouter>
    );
    expect(container.querySelector("#OnboardingSpinner")).not.toBeNull();
  }

  test("no flickering while loading organizations", () => {
    mockOnboardingLoadingState({
      isOrganizationsLoading: true,
    });
    expectLoading();
  });

  test("no flickering while loading deployments", () => {
    mockOnboardingLoadingState({
      isDeploymentsLoading: true,
    });
    expectLoading();
  });

  test("no flickering while loading blueprints", () => {
    mockOnboardingLoadingState({
      isTeamBlueprintsLoading: true,
    });
    expectLoading();
  });
});
