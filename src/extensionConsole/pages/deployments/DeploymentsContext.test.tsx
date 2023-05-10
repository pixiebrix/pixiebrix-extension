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

import React, { useContext } from "react";
import { render } from "@/extensionConsole/testHelpers";
import DeploymentsContext, {
  DeploymentsProvider,
} from "@/extensionConsole/pages/deployments/DeploymentsContext";
import AsyncButton from "@/components/AsyncButton";
import { waitForEffect } from "@/testUtils/testHelpers";
import MockAdapter from "axios-mock-adapter";
import axios from "axios";
import userEvent from "@testing-library/user-event";
import { act } from "@testing-library/react";
import { deploymentFactory } from "@/testUtils/factories";
import {
  getLinkedApiClient,
  maybeGetLinkedApiClient,
} from "@/services/apiClient";
import { getErrorMessage } from "@/errors/errorHelpers";
import { type ExtensionOptionsState } from "@/store/extensionsTypes";

const axiosMock = new MockAdapter(axios);

jest.mock("@/services/apiClient", () => ({
  getLinkedApiClient: jest.fn(),
  maybeGetLinkedApiClient: jest.fn(),
}));

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
  });

  it("don't error on activating empty list of deployments", async () => {
    axiosMock.onPost("/api/deployments/").reply(200, []);
    const wrapper = render(
      <DeploymentsProvider>
        <Component />
      </DeploymentsProvider>
    );

    await waitForEffect();

    expect(wrapper.queryAllByTestId("Component")).toHaveLength(1);
    expect(wrapper.queryAllByTestId("Error")).toHaveLength(0);

    await act(async () => {
      await userEvent.click(wrapper.getByText("Update"));
    });
  });

  it("activate single deployment from empty state", async () => {
    axiosMock.onPost("/api/deployments/").reply(200, [deploymentFactory()]);
    requestPermissionsMock.mockResolvedValue(true);

    const wrapper = render(
      <DeploymentsProvider>
        <Component />
      </DeploymentsProvider>
    );

    await waitForEffect();

    expect(wrapper.queryAllByTestId("Component")).toHaveLength(1);
    expect(wrapper.queryAllByTestId("Error")).toHaveLength(0);

    axiosMock.reset();

    await act(async () => {
      await userEvent.click(wrapper.getByText("Update"));
    });

    expect(requestPermissionsMock).toHaveBeenCalledTimes(1);
    // No additional requests should be made
    expect(axiosMock.history.get).toHaveLength(0);

    const { options } = wrapper.getReduxStore().getState();
    expect((options as ExtensionOptionsState).extensions).toHaveLength(1);
  });
});
