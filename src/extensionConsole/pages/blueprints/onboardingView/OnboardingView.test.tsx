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
import useFlags from "@/hooks/useFlags";
import { type Organization } from "@/types/contract";
import useOnboarding from "@/extensionConsole/pages/blueprints/onboardingView/useOnboarding";
import { useAllRecipes } from "@/recipes/recipesHooks";
import DeploymentsContext, {
  type DeploymentsState,
} from "@/extensionConsole/pages/deployments/DeploymentsContext";
import { appApiMock, mockAllApiEndpoints } from "@/testUtils/appApiMock";
import { renderHook } from "@/extensionConsole/testHelpers";

import { organizationFactory } from "@/testUtils/factories/authFactories";

jest.mock("@/hooks/useFlags", () => jest.fn());
jest.mock("@/recipes/recipesHooks", () => ({
  useAllRecipes: jest.fn(),
}));

const mockOnboarding = ({
  hasOrganization = false,
  hasTeamBlueprints = false,
  hasRestrictedFlag = false,
}: {
  hasOrganization?: boolean;
  hasTeamBlueprints?: boolean;
  hasRestrictedFlag?: boolean;
} = {}) => {
  appApiMock
    .onGet("/api/organizations/")
    .reply(200, [hasOrganization ? [organizationFactory()] : []]);

  mockAllApiEndpoints();

  (useAllRecipes as jest.Mock).mockImplementation(() => ({
    data: hasTeamBlueprints
      ? [
          {
            sharing: {
              organizations: [{} as Organization],
            },
          },
        ]
      : [],
  }));

  (useFlags as jest.Mock).mockImplementation(() => ({
    restrict: () => hasRestrictedFlag,
  }));
};

describe("useOnboarding", () => {
  beforeEach(() => {
    appApiMock.reset();
  });

  test("default user", async () => {
    mockOnboarding();
    const { result, waitForEffect } = renderHook(() => useOnboarding());
    await waitForEffect();
    expect(result.current.onboardingType).toBe("default");
  });

  test("restricted enterprise user", async () => {
    mockOnboarding({ hasOrganization: true, hasRestrictedFlag: true });
    const { result, waitForEffect } = renderHook(() => useOnboarding());
    await waitForEffect();
    expect(result.current.onboardingType).toBe("restricted");
  });

  test("unrestricted enterprise user", async () => {
    mockOnboarding({ hasOrganization: true });
    const { result, waitForEffect } = renderHook(() => useOnboarding());
    await waitForEffect();
    expect(result.current.onboardingType).toBe("default");
  });

  test("unrestricted enterprise user with teams", async () => {
    mockOnboarding({ hasOrganization: true, hasTeamBlueprints: true });
    const { result, waitForEffect } = renderHook(() => useOnboarding());
    await waitForEffect();
    expect(result.current.onboardingType).toBe("hasTeamBlueprints");
  });

  test("enterprise user with deployments", async () => {
    const deployments: DeploymentsState = {
      hasUpdate: true,
      extensionUpdateRequired: false,
      isLoading: false,
      error: undefined as unknown,
      async update() {},
      async updateExtension() {},
    };

    mockOnboarding({ hasOrganization: true });
    const { result, waitForEffect } = renderHook(() => useOnboarding(), {
      wrapper: ({ children }) => (
        <DeploymentsContext.Provider value={deployments}>
          {children}
        </DeploymentsContext.Provider>
      ),
    });

    await waitForEffect();
    expect(result.current.onboardingType).toBe("hasDeployments");
  });
});
