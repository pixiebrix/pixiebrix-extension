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
import SetupPage from "./SetupPage";
import { act, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { HashRouter } from "react-router-dom";
import { createHashHistory } from "history";
import userEvent from "@testing-library/user-event";
import { waitForEffect } from "../../../testUtils/testHelpers";
import {
  INTERNAL_reset as resetManagedStorage,
  readManagedStorage,
} from "../../../store/enterprise/managedStorage";
import { render } from "../../testHelpers";
import settingsSlice from "../../../store/settings/settingsSlice";
import {
  mockAnonymousMeApiResponse,
  mockAuthenticatedMeApiResponse,
} from "../../../testUtils/userMock";
import { meWithPartnerApiResponseFactory } from "../../../testUtils/factories/authFactories";
import notify from "../../../utils/notify";
import { CONTROL_ROOM_OAUTH_INTEGRATION_ID } from "../../../integrations/constants";
import { registry as backgroundRegistry } from "@/background/messenger/api";
import reportError from "../../../telemetry/reportError";

// Mock notify to assert success/failure because I was having issues writing assertions over the history.
jest.mock("../../../utils/notify");
jest.mock("../../../telemetry/reportError");
jest.mock("../../../auth/deploymentKey");

const notifySuccessMock = jest.mocked(notify.success);
const notifyWarnMock = jest.mocked(notify.warning);

// `pMemoize` has problems when used in tests because the promise can leak across tests. pMemoizeClear doesn't work
// because the promise hasn't resolved yet
jest.mock("p-memoize", () => {
  const memoize = jest.requireActual("p-memoize");
  return {
    ...memoize,
    __esModule: true,
    pMemoizeClear: jest.fn(),
    default: jest.fn().mockImplementation((fn) => fn),
  };
});

jest.mock("../../../data/service/baseService", () => ({
  getBaseURL: jest.fn().mockResolvedValue("https://app.pixiebrix.com"),
}));

beforeEach(async () => {
  jest.clearAllMocks();
  await resetManagedStorage();
  await browser.storage.managed.clear();
});

describe("SetupPage", () => {
  test("anonymous user with no partner", async () => {
    mockAnonymousMeApiResponse();

    render(
      <MemoryRouter>
        <SetupPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId("loader")).toBeNull();
    });

    expect(
      screen.queryByText("Connect your Automation Co-Pilot account"),
    ).toBeNull();
  });

  test("OAuth2 partner user with required service id in settings", async () => {
    await mockAuthenticatedMeApiResponse(meWithPartnerApiResponseFactory());

    render(
      <MemoryRouter>
        <SetupPage />
      </MemoryRouter>,
      {
        setupRedux(dispatch) {
          dispatch(
            settingsSlice.actions.setAuthIntegrationId({
              integrationId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
            }),
          );
        },
      },
    );

    await waitFor(() => {
      expect(screen.queryByTestId("loader")).toBeNull();
    });

    expect(
      screen.getByText("Connect your Automation Co-Pilot account"),
    ).not.toBeNull();
  });

  test("shows error toast if fetching service defitions fails for OAuth2 partner user with required service id in settings", async () => {
    await mockAuthenticatedMeApiResponse(meWithPartnerApiResponseFactory());
    jest
      .mocked(backgroundRegistry.syncRemote)
      .mockRejectedValue(new Error("sdf"));

    render(
      <MemoryRouter>
        <SetupPage />
      </MemoryRouter>,
      {
        setupRedux(dispatch) {
          dispatch(
            settingsSlice.actions.setAuthIntegrationId({
              integrationId: CONTROL_ROOM_OAUTH_INTEGRATION_ID,
            }),
          );
        },
      },
    );

    await waitFor(() => {
      expect(screen.queryByTestId("loader")).toBeNull();
    });

    expect(
      screen.getByText("Connect your Automation Co-Pilot account"),
    ).not.toBeNull();

    expect(reportError).toHaveBeenCalledWith(new Error("sdf"));

    expect(notifyWarnMock).toHaveBeenCalledWith({
      message:
        "Error retrieving partner integration definition. Reload the page. If the problem persists, restart your browser",
    });
  });

  test("Start URL for OAuth2 flow", async () => {
    const user = userEvent.setup();
    mockAnonymousMeApiResponse();

    location.href =
      "chrome-extension://abc123/options.html#/start?hostname=mycontrolroom.com";

    // Needs to use HashRouter instead of MemoryRouter for the useLocation calls in the components to work correctly
    // given the URL structure above
    render(
      <HashRouter>
        <SetupPage />
      </HashRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId("loader")).toBeNull();
    });

    expect(
      screen.getByText("Connect your Automation Co-Pilot account"),
    ).not.toBeNull();
    expect(
      screen.getByLabelText("Control Room URL").getAttribute("value"),
      // Schema should get pre-pended automatically from hostname
    ).toBe("https://mycontrolroom.com");

    // Sanity check we haven't redirected away from the start screen yet
    expect(location.href).toBe(
      "chrome-extension://abc123/options.html#/start?hostname=mycontrolroom.com",
    );

    const button = screen.getByText("Connect");
    await user.click(button);

    await waitForEffect();

    // Should have redirected away from the start page
    expect(location.href).toBe("chrome-extension://abc123/options.html#/");
  });

  test("Start URL with Community Edition hostname if user is unauthenticated", async () => {
    mockAnonymousMeApiResponse();

    const history = createHashHistory();
    // Hostname comes as hostname, not URL
    history.push(
      "/start?hostname=community2.cloud-2.automationanywhere.digital",
    );

    // Needs to use HashRouter instead of MemoryRouter for the useLocation calls in the components to work correctly
    // given the URL structure above
    render(
      <HashRouter>
        <SetupPage />
      </HashRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId("loader")).toBeNull();
    });

    expect(screen.getByTestId("link-account-btn")).not.toBeNull();
    expect(screen.queryByTestId("connect-aa-copilot-token-btn")).toBeNull();
  });

  test("Start URL with Community Edition hostname if authenticated", async () => {
    await mockAuthenticatedMeApiResponse(meWithPartnerApiResponseFactory());
    const history = createHashHistory();

    // Hostname comes as hostname, not URL
    history.push(
      "/start?hostname=community2.cloud-2.automationanywhere.digital",
    );

    // Needs to use HashRouter instead of MemoryRouter for the useLocation calls in the components to work correctly
    // given the URL structure above
    render(
      <HashRouter>
        <SetupPage />
      </HashRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId("loader")).toBeNull();
    });

    expect(screen.queryByTestId("link-account-btn")).toBeNull();
    expect(screen.queryByTestId("connect-aa-copilot-token-btn")).toBeVisible();

    expect(
      screen.getByText("Connect your Automation Co-Pilot account"),
    ).not.toBeNull();
    expect(
      screen.getByLabelText("Control Room URL").getAttribute("value"),
      // Schema get pre-pended automatically
    ).toBe("https://community2.cloud-2.automationanywhere.digital");

    expect(screen.getByLabelText("Username")).not.toBeNull();

    const user = userEvent.setup();

    await act(async () => {
      await user.type(screen.getByLabelText("Username"), "test");
      await user.type(screen.getByLabelText("Password"), "test");
      await user.click(screen.getByTestId("connect-aa-copilot-token-btn"));
    });

    expect(notifySuccessMock).toHaveBeenCalledTimes(1);
  });

  test("Managed Storage OAuth2 partner user", async () => {
    const controlRoomUrl = "https://notarealcontrolroom.com";

    mockAnonymousMeApiResponse();

    await browser.storage.managed.set({
      partnerId: "automation-anywhere",
      controlRoomUrl,
    });

    // XXX: waiting for managed storage initialization seems to be necessary to avoid test interference when
    // run with other tests. We needed to add it after some seemingly unrelated changes:
    // See test suite changes in : https://github.com/pixiebrix/pixiebrix-extension/pull/6134/
    await readManagedStorage();

    render(
      <MemoryRouter>
        <SetupPage />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.queryByTestId("loader")).toBeNull();
    });

    expect(
      screen.getByText("Connect your Automation Co-Pilot account"),
    ).not.toBeNull();
    expect(
      screen.getByLabelText("Control Room URL").getAttribute("value"),
    ).toStrictEqual(controlRoomUrl);
  });
});
