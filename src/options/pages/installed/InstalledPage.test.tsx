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
import { InstalledPage } from "./InstalledPage";
import { StaticRouter } from "react-router-dom";
import AuthContext from "@/auth/AuthContext";
import { Organization } from "@/types/contract";

jest.mock("@/services/api", () => ({
  useGetOrganizationsQuery: jest.fn(),
}));

jest.mock("@/hooks/useDeployments", () => jest.fn());

jest.mock("@/hooks/useFetch", () => jest.fn());

import { useGetOrganizationsQuery } from "@/services/api";
import useDeployments from "@/hooks/useDeployments";
import OnboardingPage from "@/options/pages/installed/OnboardingPage";
import useFetch from "@/hooks/useFetch";

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
    const { container } = render(
      <StaticRouter>
        <InstalledPage extensions={[]} push={jest.fn()} onRemove={jest.fn()} />
      </StaticRouter>
    );
    expect(container.querySelector(".ActiveBricksCard")).toBeNull();
  });
});

const mockOnboarding = (
  hasOrganization: boolean,
  hasDeployments: boolean,
  hasTeamBlueprints: boolean
) => {
  useGetOrganizationsQuery.mockImplementation(() => ({
    data: hasOrganization ? [{} as Organization] : [],
  }));

  // eslint-disable-next-line arrow-body-style -- better readability b/c it's returning a method
  useDeployments.mockImplementation(() => {
    return {
      hasUpdate: hasDeployments,
      update: () => {},
      extensionUpdateRequired: false,
      isLoading: false,
      error: undefined as unknown,
    };
  });

  useFetch.mockImplementation(() => {
    return () => ({
      data: hasTeamBlueprints
        ? [
            {
              sharing: {
                organizations: [{} as Organization],
              },
            },
          ]
        : [],
      isLoading: false,
      error: undefined as unknown,
      refresh: () => {},
    });
  });
};

const getRenderedOnboardingInformation = (screen) => {
  const activateFromMarketplaceColumn = screen.queryByText(
    "Activate an Official Blueprint"
  );

  const contactTeamAdminColumn = screen.queryByText("Contact your team admin");

  const videoTour = screen.queryByText("Video Tour");

  const createBrickColumn = screen.queryByText("Create your Own");

  const activateFromDeploymentBannerColumn = screen.queryByText(
    "You have Team Bricks to activate!"
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

describe("User Onboarding", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test("typical user with no organization", () => {
    mockOnboarding(false, false, false);

    render(
      <StaticRouter>
        <OnboardingPage />
      </StaticRouter>
    );

    const rendered = getRenderedOnboardingInformation(screen);

    expect(rendered.activateFromMarketplaceColumn).not.toBeNull();
    expect(rendered.createBrickColumn).not.toBeNull();
    expect(rendered.videoTour).not.toBeNull();
  });

  test("enterprise user with `restricted-marketplace` flag", () => {
    mockOnboarding(true, false, false);

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

    const rendered = getRenderedOnboardingInformation(screen);

    expect(rendered.activateFromMarketplaceColumn).toBeNull();
    expect(rendered.contactTeamAdminColumn).not.toBeNull();
    expect(rendered.videoTour).toBeNull();
  });

  test("enterprise user with automatic team deployments", () => {
    mockOnboarding(true, true, false);

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

    const rendered = getRenderedOnboardingInformation(screen);

    expect(rendered.activateFromMarketplaceColumn).toBeNull();
    expect(rendered.activateFromDeploymentBannerColumn).not.toBeNull();
    expect(rendered.videoTour).toBeNull();
  });

  test("enterprise user with team blueprints", () => {
    mockOnboarding(true, false, true);

    render(
      <StaticRouter>
        <OnboardingPage />
      </StaticRouter>
    );

    const rendered = getRenderedOnboardingInformation(screen);

    expect(rendered.activateTeamBlueprintsColumn).toBeNull();
    expect(rendered.createBrickColumn).not.toBeNull();
    expect(rendered.videoTour).not.toBeNull();
  });

  test("enterprise user with no team blueprints or restrictions", () => {
    mockOnboarding(true, false, false);

    render(
      <StaticRouter>
        <OnboardingPage />
      </StaticRouter>
    );

    const rendered = getRenderedOnboardingInformation(screen);

    expect(rendered.activateFromMarketplaceColumn).not.toBeNull();
    expect(rendered.createBrickColumn).not.toBeNull();
    expect(rendered.videoTour).not.toBeNull();
  });
});
