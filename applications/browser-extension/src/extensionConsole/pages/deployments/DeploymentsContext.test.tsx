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
import { getErrorMessage } from "@/errors/errorHelpers";
import { type ModComponentState } from "@/store/modComponents/modComponentTypes";
import { getLinkedApiClient } from "@/data/service/apiClient";
import {
  deploymentFactory,
  activatableDeploymentFactory,
} from "@/testUtils/factories/deploymentFactories";
import { packageConfigDetailFactory } from "@/testUtils/factories/brickFactories";
import { ExtensionNotLinkedError } from "@/errors/genericErrors";
import modComponentSlice from "@/store/modComponents/modComponentSlice";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { type Deployment } from "@/types/contract";
import { validateTimestamp } from "@/utils/timeUtils";
import { reloadModsEveryTab } from "@/contentScript/messenger/api";
import { API_PATHS } from "@/data/service/urlPaths";

jest.mock("@/contentScript/messenger/api");

const axiosMock = new MockAdapter(axios);

const getLinkedApiClientMock = jest.mocked(getLinkedApiClient);

const requestPermissionsMock = jest.mocked(browser.permissions.request);

const mockDeploymentActivationRequests = (
  deployment: Deployment,
  modDefinition: ModDefinition,
) => {
  axiosMock.onPost(API_PATHS.DEPLOYMENTS).reply(200, [deployment]);
  axiosMock
    .onGet(API_PATHS.REGISTRY_BRICK(deployment.package.package_id))
    .reply(
      200,
      packageConfigDetailFactory({
        modDefinition,
        packageVersionUUID: deployment.package.id,
      }),
    );
  requestPermissionsMock.mockResolvedValue(true);
};

const Component: React.FC = () => {
  const deployments = useContext(DeploymentsContext);
  return (
    <div data-testid="Component">
      {deployments.hasUpdate && <span>Has Update</span>}
      <AsyncButton onClick={async () => deployments.update()}>
        Update
      </AsyncButton>
      {deployments.error != null && (
        <div data-testid="Error">{getErrorMessage(deployments.error)}</div>
      )}
    </div>
  );
};

describe("DeploymentsContext", () => {
  beforeEach(() => {
    axiosMock.onGet(API_PATHS.FEATURE_FLAGS).reply(200, { flags: [] });
    jest.clearAllMocks();
    axiosMock.resetHistory();

    getLinkedApiClientMock.mockResolvedValue(axios);
  });

  it("doesn't error on activating empty list of deployments", async () => {
    axiosMock.onPost(API_PATHS.DEPLOYMENTS).reply(200, []);

    render(
      <DeploymentsProvider>
        <Component />
      </DeploymentsProvider>,
    );

    expect(screen.queryAllByTestId("Component")).toHaveLength(1);
    expect(screen.queryAllByTestId("Error")).toHaveLength(0);

    await waitForEffect();

    await waitFor(() => {
      // Initial fetch with no installed deployments
      expect(axiosMock.history.post).toHaveLength(1);
    });

    await userEvent.click(screen.getByText("Update"));

    await waitFor(() => {
      // No change in activated deployments, so no new fetch
      expect(axiosMock.history.post).toHaveLength(1);
    });

    // Permissions not requested because there's no deployments to activate
    expect(requestPermissionsMock).not.toHaveBeenCalled();
  });

  it("activate single deployment from empty state", async () => {
    const { deployment, modDefinition } = activatableDeploymentFactory();
    mockDeploymentActivationRequests(deployment, modDefinition);

    const { getReduxStore } = render(
      <DeploymentsProvider>
        <Component />
      </DeploymentsProvider>,
    );

    expect(screen.queryAllByTestId("Component")).toHaveLength(1);
    expect(screen.queryAllByTestId("Error")).toHaveLength(0);

    await waitFor(() => {
      // Initial fetch with no installed deployments
      expect(axiosMock.history.post).toHaveLength(1);
    });

    await userEvent.click(screen.getByText("Update"));

    await waitFor(() => {
      // Refetch after deployment activation
      expect(axiosMock.history.post).toHaveLength(2);
    });

    // Permissions only requested once because user has clicked update once
    expect(requestPermissionsMock).toHaveBeenCalledTimes(1);

    const { options } = getReduxStore().getState();
    expect((options as ModComponentState).activatedModComponents).toHaveLength(
      1,
    );

    expect(jest.mocked(reloadModsEveryTab)).toHaveBeenCalledTimes(1);
  });

  it("updating deployment mod id deactivates old mod", async () => {
    const { deployment, modDefinition: oldModDefinition } =
      activatableDeploymentFactory({
        deploymentOverride: {
          updated_at: validateTimestamp("2021-01-01T12:52:16.189Z"),
          created_at: validateTimestamp("2021-01-01T12:52:16.189Z"),
        },
      });

    // Remove package from the deployment so that the mod can be changed entirely
    const { package: _, ...deploymentOverride } = deployment;
    const {
      deployment: updatedDeployment,
      modDefinition: expectedModDefinition,
    } = activatableDeploymentFactory({
      deploymentOverride: {
        ...deploymentOverride,
        updated_at: validateTimestamp("2021-02-02T12:52:16.189Z"),
      },
    });

    mockDeploymentActivationRequests(updatedDeployment, expectedModDefinition);

    const { getReduxStore } = render(
      <DeploymentsProvider>
        <Component />
      </DeploymentsProvider>,
      {
        setupRedux(dispatch) {
          dispatch(
            modComponentSlice.actions.activateMod({
              modDefinition: oldModDefinition,
              deployment,
              screen: "extensionConsole",
              isReactivate: false,
            }),
          );
        },
      },
    );

    expect(screen.queryAllByTestId("Component")).toHaveLength(1);
    expect(screen.queryAllByTestId("Error")).toHaveLength(0);

    await waitFor(() => {
      // Initial fetch with old activated deployed mod
      expect(axiosMock.history.post).toHaveLength(1);
    });

    // The initial load will automatically remove the old mod.
    const { options } = getReduxStore().getState();
    expect((options as ModComponentState).activatedModComponents).toHaveLength(
      0,
    );
    expect(jest.mocked(reloadModsEveryTab)).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByText("Update"));

    await waitFor(() => {
      // Refetch after deployment activation
      expect(axiosMock.history.post).toHaveLength(3);
    });

    const { options: updatedOptions } = getReduxStore().getState();
    expect(
      (updatedOptions as ModComponentState).activatedModComponents,
    ).toHaveLength(1);

    expect(jest.mocked(reloadModsEveryTab)).toHaveBeenCalledTimes(2);
  });

  it("automatically deactivates unassigned deployments", async () => {
    const { deployment, modDefinition } = activatableDeploymentFactory({});
    // Deployment has been unassigned
    axiosMock.onPost(API_PATHS.DEPLOYMENTS).reply(200, []);

    const { getReduxStore } = render(
      <DeploymentsProvider>
        <Component />
      </DeploymentsProvider>,
      {
        setupRedux(dispatch) {
          dispatch(
            modComponentSlice.actions.activateMod({
              modDefinition,
              deployment,
              screen: "extensionConsole",
              isReactivate: false,
            }),
          );
        },
      },
    );

    await waitFor(() => {
      // Initial fetch with unassigned mod
      expect(axiosMock.history.post).toHaveLength(2);
    });

    const {
      options: { activatedModComponents },
    } = getReduxStore().getState() as { options: ModComponentState };
    expect(activatedModComponents).toHaveLength(0);
  });

  it("updating deployment reactivates mod that was previously unmanaged for restricted user", async () => {
    axiosMock
      .onGet(API_PATHS.FEATURE_FLAGS)
      .reply(200, { flags: ["restricted-uninstall"] });
    const { deployment, modDefinition } = activatableDeploymentFactory();
    mockDeploymentActivationRequests(deployment, modDefinition);

    const { getReduxStore } = render(
      <DeploymentsProvider>
        <Component />
      </DeploymentsProvider>,
      {
        setupRedux(dispatch) {
          dispatch(
            modComponentSlice.actions.activateMod({
              modDefinition,
              // No deployment, so that the mod is unmanaged
              screen: "extensionConsole",
              isReactivate: false,
            }),
          );
        },
      },
    );

    const {
      options: { activatedModComponents: initialActivatedModComponents },
    } = getReduxStore().getState() as { options: ModComponentState };
    expect(initialActivatedModComponents).toHaveLength(1);
    expect(
      initialActivatedModComponents[0]!.deploymentMetadata,
    ).toBeUndefined();

    expect(screen.queryAllByTestId("Component")).toHaveLength(1);
    expect(screen.queryAllByTestId("Error")).toHaveLength(0);

    await waitFor(() => {
      // Initial fetch with old activated deployed mod
      expect(axiosMock.history.post).toHaveLength(1);
    });

    await userEvent.click(screen.getByText("Update"));

    const {
      options: { activatedModComponents },
    } = getReduxStore().getState() as { options: ModComponentState };
    expect(activatedModComponents).toHaveLength(1);
    expect(activatedModComponents[0]!.deploymentMetadata?.id).toBe(
      deployment.id,
    );
  });

  it("remounting the DeploymentsProvider doesn't refetch the deployments", async () => {
    const { deployment, modDefinition } = activatableDeploymentFactory();
    mockDeploymentActivationRequests(deployment, modDefinition);

    const { rerender } = render(
      <DeploymentsProvider>
        <Component />
      </DeploymentsProvider>,
    );

    await waitFor(() => {
      // Initial fetch with no installed deployments
      expect(axiosMock.history.post).toHaveLength(1);
    });

    expect(screen.getByText("Has Update")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Update"));

    await waitFor(() => {
      // Refetch after deployment activation
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

    // The user already has all deployments installed, so no new fetch
    expect(screen.queryByText("Has Update")).not.toBeInTheDocument();
    expect(requestPermissionsMock).toHaveBeenCalledTimes(1);

    // Still no changes in deployments, so no new fetch even after remount
    await waitForEffect();
    expect(axiosMock.history.post).toHaveLength(2);

    expect(jest.mocked(reloadModsEveryTab)).toHaveBeenCalledTimes(1);
  });

  it("remounting the DeploymentsProvider refetches the deployments if more than 1 minute has passed", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const { deployment, modDefinition } = activatableDeploymentFactory();
    mockDeploymentActivationRequests(deployment, modDefinition);

    const { rerender } = render(
      <DeploymentsProvider>
        <Component />
      </DeploymentsProvider>,
    );

    await waitFor(() => {
      // Initial fetch with no installed deployments
      expect(axiosMock.history.post).toHaveLength(1);
    });

    expect(screen.getByText("Has Update")).toBeInTheDocument();
    await user.click(screen.getByText("Update"));

    await waitFor(() => {
      // Refetch after deployment activation
      expect(axiosMock.history.post).toHaveLength(2);
    });

    // Permissions only requested once because user has clicked update once
    expect(requestPermissionsMock).toHaveBeenCalledTimes(1);

    // Advance time by more than 1 minute
    jest.advanceTimersByTime(60_000 + 1);

    rerender(
      <DeploymentsProvider key="force-remount">
        <Component />
      </DeploymentsProvider>,
    );

    // Changes in deployments after 1 minute, so new fetch after remount
    await waitFor(() => {
      expect(axiosMock.history.post).toHaveLength(3);
    });

    await user.click(screen.getByText("Update"));
    await waitForEffect();

    expect(axiosMock.history.post).toHaveLength(3);

    expect(screen.queryByText("Has Update")).not.toBeInTheDocument();
    // Not called because there are no new deployments
    expect(requestPermissionsMock).toHaveBeenCalledTimes(1);

    expect(jest.mocked(reloadModsEveryTab)).toHaveBeenCalledTimes(1);

    jest.useRealTimers();
  });

  it("when activatedModComponents updates, it should refetch deployments", async () => {
    const { deployment, modDefinition } = activatableDeploymentFactory();

    mockDeploymentActivationRequests(deployment, modDefinition);

    const { rerender, getReduxStore } = render(
      <DeploymentsProvider>
        <Component />
      </DeploymentsProvider>,
    );

    expect(screen.queryAllByTestId("Component")).toHaveLength(1);
    expect(screen.queryAllByTestId("Error")).toHaveLength(0);

    await waitFor(() => {
      // Initial fetch with no installed deployments
      expect(axiosMock.history.post).toHaveLength(1);
    });

    getReduxStore().dispatch(
      modComponentSlice.actions.activateMod({
        modDefinition,
        deployment,
        screen: "extensionConsole",
        isReactivate: false,
      }),
    );

    rerender(
      <DeploymentsProvider>
        <Component />
      </DeploymentsProvider>,
    );

    await waitFor(() => {
      expect(axiosMock.history.post).toHaveLength(2);
    });
  });

  it("unlinked extension error is ignored", async () => {
    getLinkedApiClientMock.mockRejectedValue(new ExtensionNotLinkedError());
    axiosMock.onPost(API_PATHS.DEPLOYMENTS).reply(200, [deploymentFactory()]);
    requestPermissionsMock.mockResolvedValue(true);

    render(
      <DeploymentsProvider>
        <Component />
      </DeploymentsProvider>,
    );

    await waitForEffect();
    // Deployments are not fetched because extension is not linked
    expect(axiosMock.history.post).toHaveLength(0);
  });

  it("other deployment errors are preserved", async () => {
    axiosMock.onPost(API_PATHS.DEPLOYMENTS).reply(500);
    requestPermissionsMock.mockResolvedValue(true);

    render(
      <DeploymentsProvider>
        <Component />
      </DeploymentsProvider>,
    );

    await waitFor(() => {
      expect(axiosMock.history.post).toHaveLength(1);
    });
    expect(screen.getByTestId("Error")).toBeInTheDocument();
  });
});
