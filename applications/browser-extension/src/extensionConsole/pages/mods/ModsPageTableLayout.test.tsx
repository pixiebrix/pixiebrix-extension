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
import { act, render, screen } from "../../testHelpers";
import ModsPageTableLayout from "./ModsPageTableLayout";
import { waitForEffect } from "../../../testUtils/testHelpers";
import modsPageSlice from "./modsPageSlice";
import userEvent from "@testing-library/user-event";
import { mockAuthenticatedMeApiResponse } from "../../../testUtils/userMock";
import { appApiMock, onDeferredGet } from "../../../testUtils/appApiMock";
import {
  meApiResponseFactory,
  meOrganizationApiResponseFactory,
} from "../../../testUtils/factories/authFactories";
import { DeploymentsProvider } from "../deployments/DeploymentsContext";
import useAutoDeploy from "../deployments/useAutoDeploy";
import { API_PATHS } from "../../../data/service/urlPaths";

jest.mock("../../../modDefinitions/modDefinitionHooks", () => ({
  useAllModDefinitions: jest
    .fn()
    .mockReturnValue({ data: [], isFetchingFromCache: false }),
  useOptionalModDefinition: jest
    .fn()
    .mockReturnValue({ data: [], isFetchingFromCache: false }),
}));

jest.mock("../deployments/useAutoDeploy");
jest.mocked(useAutoDeploy).mockReturnValue({ isAutoDeploying: false });

describe("ModsPageTableLayout", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runAllTimers();
    jest.useRealTimers();
  });

  test("renders", async () => {
    const { asFragment } = render(
      <DeploymentsProvider>
        <ModsPageTableLayout />
      </DeploymentsProvider>,
      {
        setupRedux(dispatch) {},
      },
    );
    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  test("doesn't flash the 'Get Started' tab while loading", async () => {
    appApiMock.reset();

    const deferred = onDeferredGet(API_PATHS.ONBOARDING_STARTER_BLUEPRINTS);

    render(<ModsPageTableLayout />);
    await waitForEffect();
    expect(
      screen.queryByText("Welcome to the PixieBrix Extension Console"),
    ).toBeNull();
    expect(screen.queryByText("Get Started")).toBeNull();

    deferred.resolve([]);

    await waitForEffect();
    expect(
      screen.getByText("Welcome to the PixieBrix Extension Console"),
    ).not.toBeNull();
    expect(screen.getByText("Get Started")).not.toBeNull();
  });

  test("get started tab is active by default", async () => {
    render(<ModsPageTableLayout />);
    await waitForEffect();
    expect(
      screen.getByText("Welcome to the PixieBrix Extension Console"),
    ).not.toBeNull();
    expect(screen.getByText("Get Started")).not.toBeNull();
    expect(screen.getByTestId("get-started-mod-tab")).toHaveClass("active");
  });

  test("does not show 'Get Started' tab for enterprise users", async () => {
    await mockAuthenticatedMeApiResponse(
      meApiResponseFactory({
        organization: meOrganizationApiResponseFactory(),
      }),
    );
    render(<ModsPageTableLayout />);
    await waitForEffect();
    expect(
      screen.queryByText("Welcome to the PixieBrix Extension Console"),
    ).toBeNull();
    expect(screen.queryByText("Get Started")).toBeNull();
  });

  test("search query heading renders", async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    render(<ModsPageTableLayout />);

    await waitForEffect();

    await user.type(screen.getByTestId("mod-search-input"), "hello world");
    act(() => {
      jest.runAllTimers();
    });
    expect(screen.getByText('0 results for "hello world"')).not.toBeNull();

    await user.type(
      screen.getByTestId("mod-search-input"),
      " hello world again!",
    );
    act(() => {
      jest.runAllTimers();
    });
    expect(
      screen.getByText('0 results for "hello world hello world again!"'),
    ).not.toBeNull();
  });
});

describe("Serializable Data Test", () => {
  test("Pushes unserializable data to redux", async () => {
    const spy = jest.spyOn(console, "error");
    render(<ModsPageTableLayout />, {
      setupRedux(dispatch) {
        dispatch(
          modsPageSlice.actions.setSearchQuery((() => {}) as unknown as string),
        );
      },
    });

    await waitForEffect();
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining("A non-serializable value was detected"),
      expect.toBeFunction(),
      expect.toBeString(),
    );
  });
});
