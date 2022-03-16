/*
 * Copyright (C) 2022 PixieBrix, Inc.
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
import { Organization } from "@/types/contract";
import OnboardingPage from "@/options/pages/installed/OnboardingPage";
import {
  useGetOrganizationsQuery,
  useGetRecipesQuery,
  useGetAuthQuery,
} from "@/services/api";
import useDeployments from "@/hooks/useDeployments";
import { AuthState } from "@/auth/authTypes";
import { anonAuth } from "@/auth/authConstants";
import { uuidv4 } from "@/types/helpers";

jest.mock("@/services/api", () => ({
  useGetOrganizationsQuery: jest.fn(),
  useGetRecipesQuery: jest.fn(),
  useGetAuthQuery: jest.fn(),
}));

jest.mock("@/hooks/useDeployments", () => jest.fn());
jest.mock("@/utils/notify");

describe("InstalledPage", () => {
  beforeAll(() => {
    (useGetAuthQuery as jest.Mock).mockReturnValue({
      data: anonAuth,
    });
  });

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
    data: hasOrganization ? ([{}] as [Organization]) : [],
  }));

  // eslint-disable-next-line arrow-body-style -- better readability b/c it's returning a method
  (useDeployments as jest.Mock).mockImplementation(() => {
    return {
      hasUpdate: hasDeployments,
      update() {},
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
              organizations: [{}] as [Organization],
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
    data: [{}] as [Organization],
    isLoading: isOrganizationsLoading,
  }));

  // eslint-disable-next-line arrow-body-style -- better readability b/c it's returning a method
  (useDeployments as jest.Mock).mockImplementation(() => {
    return {
      hasUpdate: true,
      update() {},
      extensionUpdateRequired: false,
      isLoading: isDeploymentsLoading,
      error: undefined as unknown,
    };
  });

  (useGetRecipesQuery as jest.Mock).mockImplementation(() => ({
    data: [
      {
        sharing: {
          organizations: [{}] as [Organization],
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
    activateFromDeploymentBannerColumn,
    activateTeamBlueprintsColumn,
  };
};

describe("OnboardingPage", () => {
  const authState: AuthState = {
    flags: ["restricted-marketplace"],
    isLoggedIn: true,
    isOnboarded: true,
    extension: true,
    organizations: [{ id: uuidv4(), name: "Foo", role: 1 }],
    groups: [],
  };

  beforeEach(() => {
    (useGetAuthQuery as jest.Mock).mockReturnValue({
      data: anonAuth,
    });
  });

  afterEach(() => {
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
  });

  test("enterprise user with `restricted-marketplace` flag", () => {
    mockOnboarding({ hasOrganization: true });

    (useGetAuthQuery as jest.Mock).mockReturnValue({
      data: authState,
    });

    render(
      <StaticRouter>
        <OnboardingPage />
      </StaticRouter>
    );

    const rendered = getRenderedOnboardingInformation();

    expect(rendered.activateFromMarketplaceColumn).toBeNull();
    expect(rendered.contactTeamAdminColumn).not.toBeNull();
  });

  test("enterprise user with automatic team deployments", () => {
    mockOnboarding({
      hasOrganization: true,
      hasDeployments: true,
    });

    (useGetAuthQuery as jest.Mock).mockReturnValue({
      data: authState,
    });

    render(
      <StaticRouter>
        <OnboardingPage />
      </StaticRouter>
    );

    const rendered = getRenderedOnboardingInformation();

    expect(rendered.activateFromMarketplaceColumn).toBeNull();
    expect(rendered.activateFromDeploymentBannerColumn).not.toBeNull();
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
