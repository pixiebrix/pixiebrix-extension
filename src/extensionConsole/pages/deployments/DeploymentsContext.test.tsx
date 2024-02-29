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

import React, { useContext } from "react";
import { render, screen, waitFor } from "@/extensionConsole/testHelpers";
import DeploymentsContext, {
  DeploymentsProvider,
} from "@/extensionConsole/pages/deployments/DeploymentsContext";
import AsyncButton from "@/components/AsyncButton";
import { waitForEffect } from "@/testUtils/testHelpers";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import userEvent from "@testing-library/user-event";
import {
  getLinkedApiClient,
  maybeGetLinkedApiClient,
} from "@/data/service/apiClient";
import { getErrorMessage } from "@/errors/errorHelpers";
import { type ModComponentState } from "@/store/extensionsTypes";

import { deploymentFactory } from "@/testUtils/factories/deploymentFactories";

const axiosMock = new MockAdapter(axios);

jest.mock("@/data/service/apiClient");

jest.mocked(getLinkedApiClient).mockResolvedValue(axios.create());
jest.mocked(maybeGetLinkedApiClient).mockResolvedValue(axios.create());
const requestPermissionsMock = jest.mocked(browser.permissions.request);

const Component: React.FC = () => {
  const deployments = useContext(DeploymentsContext);
  return (
    <div data-testid="Component">
      <AsyncButton onClick={async () => deployments.update()}>
        Update
      </AsyncButton>
      {deployments.error && (
        <div data-testid="Error">{getErrorMessage(deployments.error)}</div>
      )}
    </div>
  );
};

describe("DeploymentsContext", () => {
  beforeEach(() => {
    requestPermissionsMock.mockClear();
    axiosMock.reset();
  });

  it("don't error on activating empty list of deployments", async () => {
    axiosMock.onPost("/api/deployments/").reply(200, []);
    render(
      <DeploymentsProvider>
        <Component />
      </DeploymentsProvider>,
    );

    expect(screen.queryAllByTestId("Component")).toHaveLength(1);
    expect(screen.queryAllByTestId("Error")).toHaveLength(0);

    await waitFor(() => {
      // initial fetch with no installed deployments
      expect(axiosMock.history.post).toHaveLength(1);
    });

    await userEvent.click(screen.getByText("Update"));

    await waitFor(() => {
      // No change in activated deployments, so no new fetch
      expect(axiosMock.history.post).toHaveLength(1);
    });

    // Permissions only requested once because user clicked update once
    expect(requestPermissionsMock).toHaveBeenCalledTimes(1);
  });

  it("activate single deployment from empty state", async () => {
    axiosMock.onPost("/api/deployments/").reply(200, [deploymentFactory()]);
    requestPermissionsMock.mockResolvedValue(true);

    const { getReduxStore } = render(
      <DeploymentsProvider>
        <Component />
      </DeploymentsProvider>,
    );

    expect(screen.queryAllByTestId("Component")).toHaveLength(1);
    expect(screen.queryAllByTestId("Error")).toHaveLength(0);

    await waitFor(() => {
      // initial fetch with no installed deployments
      expect(axiosMock.history.post).toHaveLength(1);
    });

    await userEvent.click(screen.getByText("Update"));

    await waitFor(() => {
      // refetch after deployment activation
      expect(axiosMock.history.post).toHaveLength(2);
    });

    // Permissions only requested once because user has clicked update once
    expect(requestPermissionsMock).toHaveBeenCalledTimes(1);

    const { options } = getReduxStore().getState();
    expect((options as ModComponentState).extensions).toHaveLength(1);
  });

  it("remounting the DeploymentsProvider doesn't refetch the deployments", async () => {
    axiosMock.onPost("/api/deployments/").reply(200, [deploymentFactory()]);
    requestPermissionsMock.mockResolvedValue(true);

    const { rerender } = render(
      <DeploymentsProvider>
        <Component />
      </DeploymentsProvider>,
    );

    await waitFor(() => {
      // initial fetch with no installed deployments
      expect(axiosMock.history.post).toHaveLength(1);
    });

    await userEvent.click(screen.getByText("Update"));

    await waitFor(() => {
      // refetch after deployment activation
      expect(axiosMock.history.post).toHaveLength(2);
    });

    // Permissions only requested once because user has clicked update once
    expect(requestPermissionsMock).toHaveBeenCalledTimes(1);

    rerender(
      <DeploymentsProvider key="force-remount">
        <Component />
      </DeploymentsProvider>,
    );

    // No changes in deployments, so no new fetch even after remount
    await waitForEffect();
    expect(axiosMock.history.post).toHaveLength(2);

    await userEvent.click(screen.getByText("Update"));

    // Permissions requested twice because user has clicked update twice
    expect(requestPermissionsMock).toHaveBeenCalledTimes(2);

    // Still no changes in deployments, so no new fetch even after remount
    await waitForEffect();
    expect(axiosMock.history.post).toHaveLength(2);
  });
});
