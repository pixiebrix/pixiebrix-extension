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

import {
  useGetAuthQuery,
  useGetOrganizationsQuery,
  useGetRecipesQuery,
} from "@/services/api";
import { Organization } from "@/types/contract";
import useDeployments from "@/hooks/useDeployments";
import useOnboarding from "@/options/pages/blueprints/onboardingView/useOnboarding";
import { renderHook } from "@testing-library/react-hooks";

jest.mock("@/services/api", () => ({
  useGetOrganizationsQuery: jest.fn(),
  useGetRecipesQuery: jest.fn(),
  useGetAuthQuery: jest.fn(),
}));

jest.mock("@/hooks/useDeployments", () => jest.fn());

const mockOnboarding = ({
  hasOrganization = false,
  hasDeployments = false,
  hasTeamBlueprints = false,
  hasRestrictedFlag = false,
}: {
  hasOrganization?: boolean;
  hasDeployments?: boolean;
  hasTeamBlueprints?: boolean;
  hasRestrictedFlag?: boolean;
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

  (useGetAuthQuery as jest.Mock).mockReturnValue({
    data: {
      flags: hasRestrictedFlag ? ["restricted-marketplace"] : [],
      isLoggedIn: true,
      isOnboarded: true,
      extension: true,
    },
  });
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

  test("unrestricted enterprise user", () => {
    mockOnboarding({ hasOrganization: true, hasTeamBlueprints: true });
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.onboardingType).toBe("hasTeamBlueprints");
  });

  test("enterprise user with deployments", () => {
    mockOnboarding({ hasOrganization: true, hasDeployments: true });
    const { result } = renderHook(() => useOnboarding());
    expect(result.current.onboardingType).toBe("hasDeployments");
  });
});
