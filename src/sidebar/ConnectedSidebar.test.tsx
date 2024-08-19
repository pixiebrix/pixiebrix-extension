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
import ConnectedSidebar from "@/sidebar/ConnectedSidebar";
import { render } from "@/sidebar/testHelpers";
import { authActions } from "@/auth/authSlice";
import { waitForEffect } from "@/testUtils/testHelpers";
import { MemoryRouter } from "react-router";
import {
  mockAnonymousMeApiResponse,
  mockAuthenticatedMeApiResponse,
} from "@/testUtils/userMock";
import useLinkState from "@/auth/useLinkState";
import {
  authStateFactory,
  meWithPartnerApiResponseFactory,
} from "@/testUtils/factories/authFactories";
import { appApiMock } from "@/testUtils/appApiMock";
import { valueToAsyncState } from "@/utils/asyncStateUtils";

jest.mock("@/auth/useLinkState");

// Needed until https://github.com/RickyMarou/jest-webextension-mock/issues/5 is implemented
browser.webNavigation.onBeforeNavigate = {
  addListener: jest.fn(),
  removeListener: jest.fn(),
  hasListener: jest.fn(),
};

jest.mock("@/contentScript/messenger/api", () => ({
  ensureStarterBricksInstalled: jest.fn(),
  getReservedSidebarEntries: jest.fn().mockResolvedValue({
    panels: [],
    forms: [],
    temporaryPanels: [],
  }),
}));

const useLinkStateMock = jest.mocked(useLinkState);

describe("SidebarApp", () => {
  beforeEach(() => {
    appApiMock.onGet("/api/marketplace/listings/").reply(200, []);
    appApiMock.onGet("/api/extensions/").reply(200, []);

    useLinkStateMock.mockReturnValue(valueToAsyncState(true));
  });

  test("renders not connected", async () => {
    mockAnonymousMeApiResponse();
    useLinkStateMock.mockReturnValue(valueToAsyncState(false));

    const { asFragment } = render(
      <MemoryRouter>
        <ConnectedSidebar />
      </MemoryRouter>,
    );
    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  test("renders connected partner view", async () => {
    await mockAuthenticatedMeApiResponse(meWithPartnerApiResponseFactory());
    useLinkStateMock.mockReturnValue(valueToAsyncState(true));

    const { asFragment } = render(
      <MemoryRouter>
        <ConnectedSidebar />
      </MemoryRouter>,
    );
    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  test("renders", async () => {
    await mockAuthenticatedMeApiResponse();

    const { asFragment } = render(
      <MemoryRouter>
        <ConnectedSidebar />
      </MemoryRouter>,
      {
        setupRedux(dispatch) {
          dispatch(authActions.setAuth(authStateFactory()));
        },
      },
    );

    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  it("registers the navigation listener", async () => {
    await mockAuthenticatedMeApiResponse();
    const { unmount } = render(
      <MemoryRouter>
        <ConnectedSidebar />
      </MemoryRouter>,
      {
        setupRedux(dispatch) {
          dispatch(authActions.setAuth(authStateFactory()));
        },
      },
    );

    expect(
      browser.webNavigation.onBeforeNavigate.addListener,
    ).toHaveBeenCalledWith(expect.any(Function));

    unmount();

    // Removed on unmount
    expect(
      browser.webNavigation.onBeforeNavigate.removeListener,
    ).toHaveBeenCalledWith(expect.any(Function));
  });
});
