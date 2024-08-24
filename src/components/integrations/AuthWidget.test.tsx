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
import { render } from "@/extensionConsole/testHelpers";
import AuthWidget from "@/components/integrations/AuthWidget";
import { generateIntegrationAndRemoteConfig } from "@/testUtils/factories/integrationFactories";
import { appApiMock } from "@/testUtils/appApiMock";
import {
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from "@testing-library/react";
import { type AuthOption } from "@/auth/authTypes";
import { uuidSequence } from "@/testUtils/factories/stringFactories";
import selectEvent from "react-select-event";
import { refreshRegistries } from "@/hooks/useRefreshRegistries";
import { clear, find, syncPackages } from "@/registry/packageRegistry";
import { integrationConfigLocator, registry } from "@/background/messenger/api";
import { refreshIntegrationConfigs } from "@/background/integrationConfigLocator";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { produce } from "immer";
import { userEvent } from "@/pageEditor/testHelpers";
import { waitForEffect } from "@/testUtils/testHelpers";
import { API_PATHS } from "@/data/service/urlPaths";

const { remoteConfig, integrationDefinition } =
  generateIntegrationAndRemoteConfig();

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

beforeAll(async () => {
  registerDefaultWidgets();
  appApiMock.onGet(API_PATHS.INTEGRATIONS).reply(200, [integrationDefinition]);
  appApiMock.onGet(API_PATHS.INTEGRATIONS_SHARED).reply(200, [remoteConfig]);
  appApiMock.onGet("/api/registry/bricks/").reply(200, [integrationDefinition]);
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

function renderContent(...authOptions: AuthOption[]) {
  render(
    <AuthWidget
      name="testField"
      integrationId={integrationDefinition.metadata.id}
      authOptions={authOptions}
      onRefresh={jest.fn()}
    />,
    {
      initialValues: {
        testField: null,
      },
    },
  );
}

describe("AuthWidget", () => {
  afterEach(async () => {
    await registry.clear();
  });

  test("given no auth options, when rendered, then shows configure and refresh buttons", async () => {
    renderContent();

    await expect(
      screen.findByRole("button", { name: "Configure" }),
    ).resolves.toBeVisible();
    expect(
      screen.getByRole("button", { name: /refresh/i, exact: false }),
    ).toBeVisible();
  });

  test("given 1 auth option, when rendered, then shows select dropdown and defaults to the only option", async () => {
    renderContent(authOption1);

    await expect(screen.findByText("Test Option 1")).resolves.toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Configure" }),
    ).not.toBeInTheDocument();
  });

  test("given multiple auth options, when rendered, then shows select dropdown but does not select an option automatically", async () => {
    renderContent(authOption1, authOption2);

    await expect(
      screen.findByText("Select configuration..."),
    ).resolves.toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Configure" }),
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

  it("handles default values properly for non-required config fields", async () => {
    const optionalFieldDefaultValue = "Optional_field_default_value";
    const integrationWithOptionalField = produce(
      integrationDefinition,
      (draft) => {
        draft.inputSchema.properties!.optionalField = {
          type: "string",
          title: "Optional Field",
          default: optionalFieldDefaultValue,
        };
      },
    );

    appApiMock
      .onGet(API_PATHS.INTEGRATIONS)
      .reply(200, [integrationWithOptionalField]);
    appApiMock
      .onGet("/api/registry/bricks/")
      .reply(200, [integrationWithOptionalField]);
    await refreshRegistries();

    renderContent(authOption1, authOption2);

    expect(screen.getByTestId("loader")).toBeVisible();

    await waitForElementToBeRemoved(() => screen.queryByTestId("loader"));

    const configSelect = await screen.findByRole("combobox");

    selectEvent.openMenu(configSelect);
    expect(screen.getByText("+ Add new")).toBeVisible();
    await selectEvent.select(configSelect, "+ Add new");

    const modal = await screen.findByRole("dialog");
    expect(modal).toBeVisible();

    await waitForEffect();

    const apiKeyField: HTMLInputElement =
      within(modal).getByLabelText("API Key");
    expect(apiKeyField).toBeVisible();
    expect(apiKeyField).toHaveValue("");
    expect(apiKeyField).not.toHaveAttribute("readonly");

    let optionalField: HTMLInputElement =
      within(modal).getByLabelText("Optional Field");
    expect(optionalField).toBeVisible();
    expect(optionalField).toHaveValue("");
    expect(optionalField).toHaveAttribute("readonly");

    // Click to enable & focus the disabled input
    await userEvent.click(optionalField);

    // Re-select input after widget changes
    optionalField = within(modal).getByLabelText("Optional Field");
    expect(optionalField).not.toHaveAttribute("readonly");
    expect(optionalField).toHaveValue(optionalFieldDefaultValue);

    // Change the value
    await userEvent.type(optionalField, "_test");
    expect(optionalField).toHaveValue(optionalFieldDefaultValue + "_test");

    // Toggle the field back to Exclude
    const optionalFieldToggle = within(
      screen.getByTestId("toggle-config.optionalField"),
    ).getByRole("button");
    expect(optionalFieldToggle).toBeVisible();
    await waitFor(async () => {
      await selectEvent.select(optionalFieldToggle, "Exclude");
    });

    // Re-select input after widget changes
    optionalField = within(modal).getByLabelText("Optional Field");
    expect(optionalField).toHaveAttribute("readonly");
    expect(optionalField).toHaveValue("");

    // Click again to re-enable the input
    await userEvent.click(optionalField);

    // Re-select input after widget changes
    optionalField = within(modal).getByLabelText("Optional Field");
    expect(optionalField).not.toHaveAttribute("readonly");
    // Should have default value again
    expect(optionalField).toHaveValue(optionalFieldDefaultValue);
  });
});
