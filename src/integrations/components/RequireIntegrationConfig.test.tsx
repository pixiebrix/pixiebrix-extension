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
import { integrationConfigLocator } from "@/background/messenger/api";
import { useAuthOptions } from "@/hooks/useAuthOptions";
import {
  integrationDependencyFactory,
  sanitizedIntegrationConfigFactory,
} from "@/testUtils/factories/integrationFactories";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { valueToAsyncState } from "@/utils/asyncStateUtils";
import { type AuthOption } from "@/auth/authTypes";
import { render, screen, userEvent } from "@/pageEditor/testHelpers";
import RequireIntegrationConfig from "@/integrations/components/RequireIntegrationConfig";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";
import { type Schema } from "@/types/schemaTypes";
import selectEvent from "react-select-event";
import { act } from "@testing-library/react";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { pipelineFactory } from "@/testUtils/factories/brickFactories";
import { checkIntegrationAuth } from "@/integrations/util/checkIntegrationAuth";
import { makeVariableExpression } from "@/utils/variableUtils";

jest.mock("@/hooks/useAuthOptions");
jest.mock("@/integrations/util/checkIntegrationAuth.ts");

const findSanitizedIntegrationConfigMock = jest.mocked(
  integrationConfigLocator.findSanitizedIntegrationConfig,
);
const useAuthOptionMock = jest.mocked(useAuthOptions);
const checkIntegrationAuthMock = jest.mocked(checkIntegrationAuth);

const integrationId = registryIdFactory();

const localConfig1 = sanitizedIntegrationConfigFactory({
  serviceId: integrationId,
  label: "Test Config 1",
});
const localConfig2 = sanitizedIntegrationConfigFactory({
  serviceId: integrationId,
  label: "Test Config 2",
});
const remoteConfig = sanitizedIntegrationConfigFactory({
  serviceId: integrationId,
  label: "Remote Config",
  proxy: true,
});

const authOptions = [localConfig1, localConfig2].map(
  ({ id, label, serviceId, config }) =>
    ({
      label,
      value: id,
      serviceId,
      local: true,
      sharingType: "private",
    }) as AuthOption,
);
useAuthOptionMock.mockReturnValue(valueToAsyncState(authOptions));

findSanitizedIntegrationConfigMock.mockImplementation(
  async (integrationId, configId) => {
    if (configId === localConfig1.id) {
      return localConfig1;
    }

    if (configId === localConfig2.id) {
      return localConfig2;
    }

    if (configId === remoteConfig.id) {
      return remoteConfig;
    }

    throw new Error("Invalid config id");
  },
);

const integrationDependency1 = integrationDependencyFactory({
  integrationId,
  configId: localConfig1.id,
});

const integrationFieldSchema: Schema = {
  $ref: `https://app.pixiebrix.com/schemas/services/${integrationId}`,
};

const ChildComponent: React.FC<{
  sanitizedConfig: SanitizedIntegrationConfig;
}> = ({ sanitizedConfig }) => (
  <div>Child Component using config {sanitizedConfig.label}</div>
);

describe("RequireIntegrationConfig", () => {
  beforeEach(() => {
    checkIntegrationAuthMock.mockReset();
  });

  it("shows auth options and renders children when option is selected", async () => {
    checkIntegrationAuthMock.mockResolvedValue(true);
    const formState = formStateFactory({
      brickPipeline: pipelineFactory({
        config: {
          integration: null,
        },
      }),
    });
    render(
      <RequireIntegrationConfig
        integrationFieldSchema={integrationFieldSchema}
        integrationFieldName="modComponent.brickPipeline[0].config.integration"
      >
        {({ sanitizedConfig }) => (
          <ChildComponent sanitizedConfig={sanitizedConfig} />
        )}
      </RequireIntegrationConfig>,
      {
        initialValues: formState,
      },
    );

    // Wait for field to be visible
    const select = await screen.findByLabelText("Integration");
    expect(select).toBeInTheDocument();
    // Child should not be visible yet
    expect(
      screen.queryByText("Child Component using config Test Config 1"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Child Component using config Test Config 2"),
    ).not.toBeInTheDocument();
    // Select the first config
    await act(async () => {
      await selectEvent.select(select, localConfig1.label!);
    });
    // Child 1 should now be visible
    await expect(
      screen.findByText("Child Component using config Test Config 1"),
    ).resolves.toBeInTheDocument();
    expect(
      screen.queryByText("Child Component using config Test Config 2"),
    ).not.toBeInTheDocument();
    // Select the second config
    await act(async () => {
      await selectEvent.select(select, localConfig2.label!);
    });
    // Child 2 should now be visible
    expect(
      screen.queryByText("Child Component using config Test Config 1"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Child Component using config Test Config 2"),
    ).toBeInTheDocument();
  });

  it("does not show children and shows error alert when integration auth is not valid", async () => {
    checkIntegrationAuthMock.mockResolvedValue(false);
    const formState = formStateFactory({
      brickPipeline: pipelineFactory({
        config: {
          integration: null,
        },
      }),
    });
    render(
      <RequireIntegrationConfig
        integrationFieldSchema={integrationFieldSchema}
        integrationFieldName="modComponent.brickPipeline[0].config.integration"
      >
        {({ sanitizedConfig }) => (
          <ChildComponent sanitizedConfig={sanitizedConfig} />
        )}
      </RequireIntegrationConfig>,
      {
        initialValues: formState,
      },
    );

    // Wait for field to be visible
    const select = await screen.findByLabelText("Integration");
    expect(select).toBeInTheDocument();
    // Child should not be visible
    expect(
      screen.queryByText("Child Component using config Test Config 1"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Child Component using config Test Config 2"),
    ).not.toBeInTheDocument();
    // Select the first config
    await act(async () => {
      await selectEvent.select(select, localConfig1.label!);
    });
    // Error alert should be visible
    expect(
      screen.getByText(
        "The configuration for this integration is invalid. Check your credentials and try again.",
      ),
    ).toBeInTheDocument();
    // Child still should not be visible
    expect(
      screen.queryByText("Child Component using config Test Config 1"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Child Component using config Test Config 2"),
    ).not.toBeInTheDocument();

    // Error should go away when a valid config is selected
    checkIntegrationAuthMock.mockResolvedValue(true);
    // Select the second config
    await act(async () => {
      await selectEvent.select(select, localConfig2.label!);
    });
    // Error alert should not be visible
    expect(
      screen.queryByText(
        "The configuration for this integration is invalid. Check your credentials and try again.",
      ),
    ).not.toBeInTheDocument();
    // Child 2 should now be visible
    expect(
      screen.queryByText("Child Component using config Test Config 1"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Child Component using config Test Config 2"),
    ).toBeInTheDocument();
  });

  it("shows retry button in error alert that calls validate again when clicked", async () => {
    checkIntegrationAuthMock.mockResolvedValue(false);
    const formState = formStateFactory({
      formStateConfig: {
        integrationDependencies: [integrationDependency1],
      },
      brickPipeline: pipelineFactory({
        config: {
          integration: makeVariableExpression(integrationDependency1.outputKey),
        },
      }),
    });
    render(
      <RequireIntegrationConfig
        integrationFieldSchema={integrationFieldSchema}
        integrationFieldName="modComponent.brickPipeline[0].config.integration"
      >
        {({ sanitizedConfig }) => (
          <ChildComponent sanitizedConfig={sanitizedConfig} />
        )}
      </RequireIntegrationConfig>,
      {
        initialValues: formState,
      },
    );

    // Wait for field to be visible
    await expect(
      screen.findByLabelText("Integration"),
    ).resolves.toBeInTheDocument();
    // Error alert should be visible
    expect(
      screen.getByText(
        "The configuration for this integration is invalid. Check your credentials and try again.",
      ),
    ).toBeInTheDocument();
    // Click the retry button
    await userEvent.click(screen.getByText("Retry"));
    // Error alert should still be visible
    expect(
      screen.getByText(
        "The configuration for this integration is invalid. Check your credentials and try again.",
      ),
    ).toBeInTheDocument();
    expect(checkIntegrationAuthMock).toHaveBeenCalledTimes(2);
  });

  it("#8504: link to admin console for remote config error", async () => {
    checkIntegrationAuthMock.mockResolvedValue(false);

    const remoteDependency = integrationDependencyFactory({
      integrationId,
      configId: remoteConfig.id,
    });

    const formState = formStateFactory({
      formStateConfig: {
        integrationDependencies: [remoteDependency],
      },
      brickPipeline: pipelineFactory({
        config: {
          integration: makeVariableExpression(remoteDependency.outputKey),
        },
      }),
    });
    render(
      <RequireIntegrationConfig
        integrationFieldSchema={integrationFieldSchema}
        integrationFieldName="modComponent.brickPipeline[0].config.integration"
      >
        {({ sanitizedConfig }) => (
          <ChildComponent sanitizedConfig={sanitizedConfig} />
        )}
      </RequireIntegrationConfig>,
      {
        initialValues: formState,
      },
    );

    // Wait for field to be visible
    await expect(
      screen.findByLabelText("Integration"),
    ).resolves.toBeInTheDocument();

    const editLink = screen.getByRole("link", {
      name: /edit the integration configuration here/i,
    });
    expect(editLink as HTMLAnchorElement).toHaveAttribute(
      "href",
      "https://app.pixiebrix.com",
    );
  });
});
