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
import { useGetOrganizationsQuery } from "@/services/api";
import useFlags from "@/hooks/useFlags";
import { type Organization } from "@/types/contract";
import useOnboarding from "@/extensionConsole/pages/blueprints/onboardingView/useOnboarding";
import { renderHook } from "@testing-library/react-hooks";
import { useAllRecipes } from "@/recipes/recipesHooks";
import DeploymentsContext, {
  type DeploymentsState,
} from "@/extensionConsole/pages/deployments/DeploymentsContext";

jest.mock("react-redux", () => ({
  useSelector: jest.fn(),
}));

jest.mock("@/services/api", () => ({
  useGetOrganizationsQuery: jest.fn(),
}));

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
  (useGetOrganizationsQuery as jest.Mock).mockImplementation(() => ({
    data: hasOrganization ? [{} as Organization] : [],
  }));

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
  test("default user", () => {
    mockOnboarding();
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.onboardingType).toBe("default");
  });

  test("restricted enterprise user", () => {
    mockOnboarding({ hasOrganization: true, hasRestrictedFlag: true });
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.onboardingType).toBe("restricted");
  });

  test("unrestricted enterprise user", () => {
    mockOnboarding({ hasOrganization: true });
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.onboardingType).toBe("default");
  });

  test("unrestricted enterprise user with teams", () => {
    mockOnboarding({ hasOrganization: true, hasTeamBlueprints: true });
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.onboardingType).toBe("hasTeamBlueprints");
  });

  test("enterprise user with deployments", () => {
    const deployments: DeploymentsState = {
      hasUpdate: true,
      extensionUpdateRequired: false,
      isLoading: false,
      error: undefined as unknown,
      async update() {},
      async updateExtension() {},
    };

    mockOnboarding({ hasOrganization: true });
    const { result } = renderHook(() => useOnboarding(), {
      wrapper: ({ children }) => (
        <DeploymentsContext.Provider value={deployments}>
          {children}
        </DeploymentsContext.Provider>
      ),
    });
    expect(result.current.onboardingType).toBe("hasDeployments");
  });
});
