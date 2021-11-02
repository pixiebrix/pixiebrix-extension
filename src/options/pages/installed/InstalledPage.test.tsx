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

import { queryByText, render } from "@testing-library/react";
import { InstalledPage } from "./InstalledPage";
import { StaticRouter } from "react-router-dom";
import AuthContext from "@/auth/AuthContext";
import { Organization } from "@/types/contract";

// TODO: Return different organization data per onboarding test
jest.mock("@/services/api", () => ({
  useGetOrganizationsQuery: () => ({ data: [] as Organization[] }),
}));

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

// TODO: Return different deployment data per test
// eslint-disable-next-line arrow-body-style -- better readability b/c it's returning a method
jest.mock("@/hooks/useDeployments", () => {
  return () => ({
    hasUpdate: true,
    update: () => {},
    extensionUpdateRequired: false,
    isLoading: false,
    error: undefined as unknown,
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

describe("User Onboarding", () => {
  afterAll(() => {
    jest.resetAllMocks();
  });

  // TODO: Change me
  jest.mock("@/hooks/common", () => ({
    useAsyncState: jest.fn().mockReturnValue([[], false, null, jest.fn()]),
  }));

  test("user with `restricted-onboarding` flag doesn't see marketplace link", () => {
    const { container } = render(
      <AuthContext.Provider
        value={{
          flags: ["restricted-marketplace"],
          isLoggedIn: true,
          isOnboarded: true,
          extension: true,
        }}
      >
        <StaticRouter>
          <InstalledPage
            extensions={[]}
            push={jest.fn()}
            onRemove={jest.fn()}
          />
        </StaticRouter>
      </AuthContext.Provider>
    );

    const activeBricksCard = queryByText(
      container,
      "Activate an Official Blueprint"
    );
    expect(activeBricksCard).toBeNull();
  });

  test("user without restricted-onboarding flag sees marketplace", () => {
    const { container } = render(
      <AuthContext.Provider
        value={{
          flags: [],
          isLoggedIn: true,
          isOnboarded: true,
          extension: true,
        }}
      >
        <StaticRouter>
          <InstalledPage
            extensions={[]}
            push={jest.fn()}
            onRemove={jest.fn()}
          />
        </StaticRouter>
      </AuthContext.Provider>
    );

    const activeBricksCard = queryByText(
      container,
      "Activate an Official Blueprint"
    );
    expect(activeBricksCard);
  });
});
