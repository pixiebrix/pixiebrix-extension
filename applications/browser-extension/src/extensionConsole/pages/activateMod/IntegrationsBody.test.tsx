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
import { useAuthOptions } from "@/hooks/useAuthOptions";
import {
  type IntegrationDefinition,
  type IntegrationDependency,
} from "@/integrations/integrationTypes";
import { type AuthOption } from "@/auth/authTypes";
import { valueToAsyncState } from "@/utils/asyncStateUtils";
import { appApiMock } from "@/testUtils/appApiMock";
import { validateRegistryId } from "@/types/helpers";
import { render } from "@/extensionConsole/testHelpers";
import IntegrationsBody from "@/extensionConsole/pages/activateMod/IntegrationsBody";
import { defaultModDefinitionFactory } from "@/testUtils/factories/modDefinitionFactories";
import { autoUUIDSequence } from "@/testUtils/factories/stringFactories";
import { act, screen } from "@testing-library/react";
import selectEvent from "react-select-event";
import {
  generateIntegrationAndRemoteConfig,
  integrationDependencyFactory,
} from "@/testUtils/factories/integrationFactories";
import getModDefinitionIntegrationIds from "@/integrations/util/getModDefinitionIntegrationIds";
import { registry, integrationConfigLocator } from "@/background/messenger/api";
import { refreshIntegrationConfigs } from "@/background/integrationConfigLocator";
import { clear, find, syncPackages } from "@/registry/packageRegistry";
import { type ModDefinition } from "@/types/modDefinitionTypes";
import { produce } from "immer";
import { refreshRegistries } from "@/hooks/useRefreshRegistries";
import { API_PATHS } from "@/data/service/urlPaths";

jest.mock("@/hooks/useAuthOptions");
jest.mock("@/integrations/util/getModDefinitionIntegrationIds");

const useAuthOptionsMock = jest.mocked(useAuthOptions);
const getIntegrationIdsMock = jest.mocked(getModDefinitionIntegrationIds);

const integrationId1 = validateRegistryId("test/integration1");
const integrationId2 = validateRegistryId("test/integration2");

const emptyAuthOptions: AuthOption[] = [];
const sharedOption1a: AuthOption = {
  label: "Shared Option 1a",
  local: false,
  serviceId: integrationId1,
  sharingType: "shared",
  value: autoUUIDSequence(),
};
const sharedOption1b: AuthOption = {
  label: "Shared Option 1b",
  local: false,
  serviceId: integrationId1,
  sharingType: "shared",
  value: autoUUIDSequence(),
};
const sharedOption2a: AuthOption = {
  label: "Shared Option 2a",
  local: false,
  serviceId: integrationId2,
  sharingType: "shared",
  value: autoUUIDSequence(),
};
const sharedOption2b: AuthOption = {
  label: "Shared Option 2b",
  local: false,
  serviceId: integrationId2,
  sharingType: "shared",
  value: autoUUIDSequence(),
};
const builtInOption1a: AuthOption = {
  label: "Built-in Option 1a",
  local: false,
  serviceId: integrationId1,
  sharingType: "built-in",
  value: autoUUIDSequence(),
};
const builtInOption1b: AuthOption = {
  label: "Built-in Option 1b",
  local: false,
  serviceId: integrationId1,
  sharingType: "built-in",
  value: autoUUIDSequence(),
};

const { integrationDefinition: _integrationDefinition1 } =
  generateIntegrationAndRemoteConfig();
const integrationDefinition1 = produce(_integrationDefinition1, (draft) => {
  draft.metadata.id = integrationId1;
});
const { integrationDefinition: _integrationDefinition2 } =
  generateIntegrationAndRemoteConfig();
const integrationDefinition2 = produce(_integrationDefinition2, (draft) => {
  draft.metadata.id = integrationId2;
});

beforeAll(async () => {
  // These are only used for the service names in the descriptors
  appApiMock
    .onGet(API_PATHS.INTEGRATIONS)
    .reply(200, [integrationDefinition1, integrationDefinition2]);
  appApiMock.onGet(API_PATHS.INTEGRATIONS_SHARED).reply(200, []);
  appApiMock
    .onGet(API_PATHS.REGISTRY_BRICKS)
    .reply(200, [integrationDefinition1, integrationDefinition2]);
  // Wire up directly to the background implementations for integration testing
  jest
    .mocked(integrationConfigLocator.refresh)
    .mockImplementation(refreshIntegrationConfigs);
  jest.mocked(registry.syncRemote).mockImplementation(syncPackages);
  jest.mocked(registry.find).mockImplementation(find);
  jest.mocked(registry.clear).mockImplementation(clear);

  await refreshRegistries();
});

afterAll(() => {
  appApiMock.reset();
});

async function expectServiceDescriptorVisible(service: IntegrationDefinition) {
  await expect(screen.findByText(service.metadata.name)).resolves.toBeVisible();
  await expect(screen.findByText(service.metadata.id)).resolves.toBeVisible();
}

async function expectRefreshButton(count?: number) {
  if (count) {
    await expect(
      screen.findAllByRole("button", { name: /refresh/i }),
    ).resolves.toHaveLength(count);
  } else {
    await expect(
      screen.findByRole("button", { name: /refresh/i }),
    ).resolves.toBeVisible();
  }
}

async function expectFieldToBeHidden(integration: IntegrationDefinition) {
  // Wait for automatic form submit button to be shown
  await expect(
    screen.findByRole("button", { name: /submit/i }),
  ).resolves.toBeVisible();

  // Expect no service descriptor to be shown
  expect(screen.queryByText(integration.metadata.name)).not.toBeInTheDocument();
  expect(screen.queryByText(integration.metadata.id)).not.toBeInTheDocument();
  // Expect no combobox input
  expect(
    screen.queryByRole("combobox", { name: integration.metadata.name }),
  ).not.toBeInTheDocument();
}

function renderContent({
  modDefinition = defaultModDefinitionFactory(),
  integrationDependencies = [],
  showOwnTitle,
  hideBuiltInIntegrations,
}: {
  modDefinition?: ModDefinition;
  integrationDependencies: IntegrationDependency[];
  showOwnTitle?: boolean;
  hideBuiltInIntegrations?: boolean;
}) {
  render(
    <IntegrationsBody
      mod={modDefinition}
      showOwnTitle={showOwnTitle}
      hideBuiltInIntegrations={hideBuiltInIntegrations}
    />,
    {
      initialValues: {
        integrationDependencies,
      },
    },
  );
}

describe("IntegrationsBody", () => {
  it("renders with one service and no options and does not render title", async () => {
    useAuthOptionsMock.mockReturnValue(valueToAsyncState(emptyAuthOptions));
    getIntegrationIdsMock.mockReturnValue([integrationId1]);
    renderContent({
      integrationDependencies: [
        integrationDependencyFactory({ integrationId: integrationId1 }),
      ],
    });

    await expectServiceDescriptorVisible(integrationDefinition1);
    await expectRefreshButton();

    // Check that "configure" button is also shown when there are no options
    expect(screen.getByRole("button", { name: /configure/i })).toBeVisible();
    // Ensure Integrations title is not shown
    expect(screen.queryByText(/integrations/i)).not.toBeInTheDocument();
  });

  it("renders own title properly", async () => {
    useAuthOptionsMock.mockReturnValue(valueToAsyncState(emptyAuthOptions));
    getIntegrationIdsMock.mockReturnValue([integrationId1]);
    renderContent({
      integrationDependencies: [
        integrationDependencyFactory({ integrationId: integrationId1 }),
      ],
      showOwnTitle: true,
    });

    // Ensure Integrations title is shown
    await expect(
      screen.findByRole("heading", { name: "Integrations" }),
    ).resolves.toBeVisible();
  });

  it("does not hide field with one service, no options for the service, but other options exist", async () => {
    useAuthOptionsMock.mockReturnValue(
      valueToAsyncState([sharedOption2a, sharedOption2b]),
    );
    getIntegrationIdsMock.mockReturnValue([integrationId1]);
    renderContent({
      integrationDependencies: [
        integrationDependencyFactory({ integrationId: integrationId1 }),
      ],
    });

    await expectServiceDescriptorVisible(integrationDefinition1);
    await expectRefreshButton();
    // Check that "configure" button is also shown when there are no options
    expect(screen.getByRole("button", { name: /configure/i })).toBeVisible();
  });

  it("renders with one service and two auth options", async () => {
    useAuthOptionsMock.mockReturnValue(
      valueToAsyncState([sharedOption1a, sharedOption1b]),
    );
    getIntegrationIdsMock.mockReturnValue([integrationId1]);
    renderContent({
      integrationDependencies: [
        integrationDependencyFactory({
          integrationId: integrationId1,
          configId: sharedOption1a.value,
        }),
      ],
    });

    await expectServiceDescriptorVisible(integrationDefinition1);
    await expectRefreshButton();
    // Expect the first option to be selected
    expect(screen.getByText(sharedOption1a.label)).toBeVisible();
  });

  it("can change option with one service and two auth options", async () => {
    useAuthOptionsMock.mockReturnValue(
      valueToAsyncState([sharedOption1a, sharedOption1b]),
    );
    getIntegrationIdsMock.mockReturnValue([integrationId1]);
    renderContent({
      integrationDependencies: [
        integrationDependencyFactory({
          integrationId: integrationId1,
          configId: sharedOption1a.value,
        }),
      ],
    });

    await expectServiceDescriptorVisible(integrationDefinition1);
    await expectRefreshButton();
    // Expect the first option to be selected
    expect(screen.getByText(sharedOption1a.label)).toBeVisible();

    // Select the second option
    const selectInput = screen.getByRole("combobox");
    await act(async () => {
      await selectEvent.select(selectInput, sharedOption1b.label);
    });
    expect(screen.getByText(sharedOption1b.label)).toBeVisible();
  });

  it("renders with two services and two auth options each", async () => {
    useAuthOptionsMock.mockReturnValue(
      valueToAsyncState([
        sharedOption1a,
        sharedOption1b,
        sharedOption2a,
        sharedOption2b,
      ]),
    );
    getIntegrationIdsMock.mockReturnValue([integrationId1, integrationId2]);
    renderContent({
      integrationDependencies: [
        integrationDependencyFactory({
          integrationId: integrationId1,
          configId: sharedOption1a.value,
        }),
        integrationDependencyFactory({
          integrationId: integrationId2,
          configId: sharedOption2a.value,
        }),
      ],
    });

    await expectServiceDescriptorVisible(integrationDefinition1);
    await expectServiceDescriptorVisible(integrationDefinition2);
    // Each widget will have a refresh button
    await expectRefreshButton(2);
    // Expect the first option to be selected for each service
    expect(screen.getByText(sharedOption1a.label)).toBeVisible();
    expect(screen.getByText(sharedOption2a.label)).toBeVisible();
  });

  it("hides one field and label when one built-in option", async () => {
    useAuthOptionsMock.mockReturnValue(valueToAsyncState([builtInOption1a]));
    getIntegrationIdsMock.mockReturnValue([integrationId1]);
    renderContent({
      integrationDependencies: [
        integrationDependencyFactory({
          integrationId: integrationId1,
          configId: builtInOption1a.value,
        }),
      ],
      hideBuiltInIntegrations: true,
    });

    await expectFieldToBeHidden(integrationDefinition1);
  });

  it("hides one field when two built-in options", async () => {
    useAuthOptionsMock.mockReturnValue(
      valueToAsyncState([builtInOption1a, builtInOption1b]),
    );
    getIntegrationIdsMock.mockReturnValue([integrationId1]);
    renderContent({
      integrationDependencies: [
        integrationDependencyFactory({
          integrationId: integrationId1,
          configId: builtInOption1a.value,
        }),
      ],
      hideBuiltInIntegrations: true,
    });

    await expectFieldToBeHidden(integrationDefinition1);
  });

  it("shows one field when one built-in option and one shared", async () => {
    useAuthOptionsMock.mockReturnValue(
      valueToAsyncState([builtInOption1a, sharedOption1a]),
    );
    getIntegrationIdsMock.mockReturnValue([integrationId1]);
    renderContent({
      integrationDependencies: [
        integrationDependencyFactory({
          integrationId: integrationId1,
          configId: builtInOption1a.value,
        }),
      ],
      hideBuiltInIntegrations: true,
    });

    await expectServiceDescriptorVisible(integrationDefinition1);
    await expectRefreshButton();
    // Expect the first option to be selected
    expect(screen.getByText(builtInOption1a.label)).toBeVisible();
  });

  it("does not hide field after switching to built-in option when one built-in option and one shared", async () => {
    useAuthOptionsMock.mockReturnValue(
      valueToAsyncState([builtInOption1a, sharedOption1a]),
    );
    getIntegrationIdsMock.mockReturnValue([integrationId1]);
    renderContent({
      integrationDependencies: [
        integrationDependencyFactory({
          integrationId: integrationId1,
          configId: sharedOption1a.value,
        }),
      ],
      hideBuiltInIntegrations: true,
    });

    await expectServiceDescriptorVisible(integrationDefinition1);
    await expectRefreshButton();
    // Expect the shared option to be selected
    expect(screen.getByText(sharedOption1a.label)).toBeVisible();

    // Select the built-in option
    const selectInput = screen.getByRole("combobox");
    await act(async () => {
      await selectEvent.select(selectInput, builtInOption1a.label);
    });
    // Expect widget elements still visible
    await expectServiceDescriptorVisible(integrationDefinition1);
    await expectRefreshButton();
    // Expect built-in option selected
    expect(screen.getByText(builtInOption1a.label)).toBeVisible();
  });

  it("hides one of two fields when one built-in option", async () => {
    useAuthOptionsMock.mockReturnValue(
      valueToAsyncState([builtInOption1a, sharedOption2a, sharedOption2b]),
    );
    getIntegrationIdsMock.mockReturnValue([integrationId1, integrationId2]);
    renderContent({
      integrationDependencies: [
        integrationDependencyFactory({
          integrationId: integrationId1,
          configId: builtInOption1a.value,
        }),
        integrationDependencyFactory({
          integrationId: integrationId2,
          configId: sharedOption2a.value,
        }),
      ],
      hideBuiltInIntegrations: true,
    });

    await expectRefreshButton();

    // Expect only field 2 visible
    await expectServiceDescriptorVisible(integrationDefinition2);
    await expectFieldToBeHidden(integrationDefinition1);

    // Expect the first option to be selected for service 2
    expect(screen.getByText(sharedOption2a.label)).toBeVisible();
  });

  it("hides one of two fields when two built-in options", async () => {
    useAuthOptionsMock.mockReturnValue(
      valueToAsyncState([
        builtInOption1a,
        builtInOption1b,
        sharedOption2a,
        sharedOption2b,
      ]),
    );
    getIntegrationIdsMock.mockReturnValue([integrationId1, integrationId2]);
    renderContent({
      integrationDependencies: [
        integrationDependencyFactory({
          integrationId: integrationId1,
          configId: builtInOption1a.value,
        }),
        integrationDependencyFactory({
          integrationId: integrationId2,
          configId: sharedOption2b.value,
        }),
      ],
      hideBuiltInIntegrations: true,
    });

    await expectRefreshButton();

    // Expect only field 2 visible
    await expectServiceDescriptorVisible(integrationDefinition2);
    await expectFieldToBeHidden(integrationDefinition1);

    // Expect the second option to be selected for service 2
    expect(screen.getByText(sharedOption2b.label)).toBeVisible();
  });
});
