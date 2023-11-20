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
import { render } from "@/extensionConsole/testHelpers";
import AuthWidget from "@/components/integrations/AuthWidget";
import {
  keyAuthIntegrationDefinitionFactory,
  remoteIntegrationConfigurationFactory,
} from "@/testUtils/factories/integrationFactories";
import { appApiMock } from "@/testUtils/appApiMock";
import {
  screen,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";
import { metadataFactory } from "@/testUtils/factories/metadataFactory";
import { type AuthOption } from "@/auth/authTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import selectEvent from "react-select-event";
import useRefreshRegistries from "@/hooks/useRefreshRegistries";
import {
  clear,
  find,
  type Kind,
  syncPackages,
} from "@/registry/packageRegistry";
import { registry, services } from "@/background/messenger/api";
import { refreshServices } from "@/background/locator";
import Loader from "@/components/Loader";
import { type IntegrationDefinition } from "@/integrations/integrationTypes";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";

const remoteConfig = remoteIntegrationConfigurationFactory();

const integrationDefinition: IntegrationDefinition & { kind: Kind } = {
  ...keyAuthIntegrationDefinitionFactory({
    metadata: metadataFactory({
      id: remoteConfig.service.config.metadata.id,
    }),
  }),
  kind: "service" as Kind,
};

const authOption1: AuthOption = {
  label: "Test Option 1",
  value: uuidSequence(1),
  serviceId: remoteConfig.service.config.metadata.id,
  local: false,
  sharingType: "shared",
};

const authOption2: AuthOption = {
  label: "Test Option 2",
  value: uuidSequence(2),
  serviceId: remoteConfig.service.config.metadata.id,
  local: false,
  sharingType: "shared",
};

beforeAll(() => {
  registerDefaultWidgets();
  appApiMock.onGet("/api/services/").reply(200, [integrationDefinition]);
  appApiMock.onGet("/api/services/shared/").reply(200, [remoteConfig]);
  appApiMock.onGet("/api/registry/bricks/").reply(200, [integrationDefinition]);
  jest.mocked(services.refresh).mockImplementation(refreshServices);
  // Wire up directly to the background implementations for integration testing
  jest.mocked(registry.syncRemote).mockImplementation(syncPackages);
  jest.mocked(registry.find).mockImplementation(find);
  jest.mocked(registry.clear).mockImplementation(clear);
});

const Content: React.FC<{ authOptions: AuthOption[] }> = ({ authOptions }) => {
  const [loaded] = useRefreshRegistries();

  if (!loaded) {
    return <Loader />;
  }

  return (
    <AuthWidget
      name="testField"
      integrationId={integrationDefinition.metadata.id}
      authOptions={authOptions}
      onRefresh={jest.fn()}
    />
  );
};

function renderContent(...authOptions: AuthOption[]) {
  render(<Content authOptions={authOptions} />, {
    initialValues: {
      testField: null,
    },
  });
}

describe("AuthWidget", () => {
  afterEach(async () => {
    await registry.clear();
  });

  test("given no auth options, when rendered, then shows configure and refresh buttons", async () => {
    renderContent();

    expect(
      await screen.findByRole("button", { name: "Configure" })
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: /refresh/i, exact: false })
    ).toBeVisible();
  });

  test("given 1 auth option, when rendered, then shows select dropdown and defaults to the only option", async () => {
    renderContent(authOption1);

    expect(await screen.findByText("Test Option 1")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Configure" })
    ).not.toBeInTheDocument();
  });

  test("given multiple auth options, when rendered, then shows select dropdown but does not select an option automatically", async () => {
    renderContent(authOption1, authOption2);

    expect(await screen.findByText("Select configuration...")).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Configure" })
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Test Option 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Test Option 2")).not.toBeInTheDocument();
  });

  test("given multiple auth options, when select add new, then shows integration config modal", async () => {
    renderContent(authOption1, authOption2);

    expect(screen.getByTestId("loader")).toBeVisible();

    await waitForElementToBeRemoved(() => screen.queryByTestId("loader"));

    const configSelect = await screen.findByRole("combobox");

    selectEvent.openMenu(configSelect);

    expect(screen.getByText("Test Option 1")).toBeVisible();
    expect(screen.getByText("Test Option 2")).toBeVisible();
    expect(screen.getByText("+ Add new")).toBeVisible();

    await selectEvent.select(configSelect, "+ Add new");

    const modal = await screen.findByRole("dialog");
    expect(modal).toBeVisible();
    expect(within(modal).getByLabelText("API Key")).toBeVisible();
  });
});
