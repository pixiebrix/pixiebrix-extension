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
import ConnectedSidebar from "@/sidebar/ConnectedSidebar";
import { render } from "@/sidebar/testHelpers";
import { authActions } from "@/auth/authSlice";
import { waitForEffect } from "@/testUtils/testHelpers";
import { MemoryRouter } from "react-router";
import { mockAnonymousUser, mockCachedUser } from "@/testUtils/userMock";
import useLinkState from "@/auth/useLinkState";
import {
  authStateFactory,
  partnerUserFactory,
  userFactory,
} from "@/testUtils/factories/authFactories";
import { appApiMock } from "@/testUtils/appApiMock";

jest.mock("@/auth/useLinkState");

jest.mock("@/contentScript/messenger/api", () => ({
  ensureExtensionPointsInstalled: jest.fn(),
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

    useLinkStateMock.mockReturnValue({
      hasToken: true,
      tokenLoading: false,
      tokenError: null,
    });
  });

  test("renders not connected", async () => {
    mockAnonymousUser();
    useLinkStateMock.mockReturnValue({
      hasToken: false,
      tokenLoading: false,
      tokenError: null,
    });

    const { asFragment } = render(
      <MemoryRouter>
        <ConnectedSidebar />
      </MemoryRouter>,
    );
    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  test("renders not connected partner view", async () => {
    // Is this a real state? The use in meQueryState couldn't be set if hasToken is `false`
    mockCachedUser(partnerUserFactory());
    useLinkStateMock.mockReturnValue({
      hasToken: false,
      tokenLoading: false,
      tokenError: null,
    });

    const { asFragment } = render(
      <MemoryRouter>
        <ConnectedSidebar />
      </MemoryRouter>,
    );
    await waitForEffect();

    expect(asFragment()).toMatchSnapshot();
  });

  test("renders", async () => {
    mockCachedUser(userFactory());

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
});
