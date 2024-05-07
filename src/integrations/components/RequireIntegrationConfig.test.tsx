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
import { services } from "@/background/messenger/strict/api";
import { useAuthOptions } from "@/hooks/auth";
import {
  integrationDependencyFactory,
  sanitizedIntegrationConfigFactory,
} from "@/testUtils/factories/integrationFactories";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { valueToAsyncState } from "@/utils/asyncStateUtils";
import { type AuthOption } from "@/auth/authTypes";
import { render, screen } from "@/pageEditor/testHelpers";
import RequireIntegrationConfig from "@/integrations/components/RequireIntegrationConfig";
import { registryIdFactory } from "@/testUtils/factories/stringFactories";
import { type Schema } from "@/types/schemaTypes";
import selectEvent from "react-select-event";
import { waitFor } from "@testing-library/react";
import { formStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { pipelineFactory } from "@/testUtils/factories/brickFactories";
import { checkIntegrationAuth } from "@/integrations/util/checkIntegrationAuth";
import { makeVariableExpression } from "@/utils/variableUtils";

jest.mock("@/hooks/auth");
jest.mock("@/integrations/util/checkIntegrationAuth.ts");

const serviceLocateMock = jest.mocked(services.locate);
const useAuthOptionMock = jest.mocked(useAuthOptions);
const checkIntegrationAuthMock = jest.mocked(checkIntegrationAuth);

const integrationId = registryIdFactory();

const config1 = sanitizedIntegrationConfigFactory({
  serviceId: integrationId,
  label: "Test Config 1",
});
const config2 = sanitizedIntegrationConfigFactory({
  serviceId: integrationId,
  label: "Test Config 2",
});

const authOptions = [config1, config2].map(
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

serviceLocateMock.mockImplementation(async (integrationId, configId) => {
  if (configId === config1.id) {
    return config1;
  }

  if (configId === config2.id) {
    return config2;
  }

  throw new Error("Invalid config id");
});

const integrationDependency1 = integrationDependencyFactory({
  integrationId,
  configId: config1.id,
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
    const formState = formStateFactory(
      undefined,
      pipelineFactory({
        config: {
          integration: null,
        },
      }),
    );
    render(
      <RequireIntegrationConfig
        integrationFieldSchema={integrationFieldSchema}
        integrationFieldName="extension.blockPipeline[0].config.integration"
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
    await waitFor(async () => {
      await selectEvent.select(select, config1.label);
    });
    // Child 1 should now be visible
    await expect(
      screen.findByText("Child Component using config Test Config 1"),
    ).resolves.toBeInTheDocument();
    expect(
      screen.queryByText("Child Component using config Test Config 2"),
    ).not.toBeInTheDocument();
    // Select the second config
    await waitFor(async () => {
      await selectEvent.select(select, config2.label);
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
    const formState = formStateFactory(
      undefined,
      pipelineFactory({
        config: {
          integration: null,
        },
      }),
    );
    render(
      <RequireIntegrationConfig
        integrationFieldSchema={integrationFieldSchema}
        integrationFieldName="extension.blockPipeline[0].config.integration"
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
    await waitFor(async () => {
      await selectEvent.select(select, config1.label);
    });
    // Child still should not be visible
    expect(
      screen.queryByText("Child Component using config Test Config 1"),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("Child Component using config Test Config 2"),
    ).not.toBeInTheDocument();
    // Error alert should be visible
    expect(
      screen.getByText(
        "The configuration for this integration is invalid. Check your credentials and try again.",
      ),
    ).toBeInTheDocument();

    // Error should go away when a valid config is selected
    checkIntegrationAuthMock.mockResolvedValue(true);
    // Select the second config
    await waitFor(async () => {
      await selectEvent.select(select, config2.label);
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
    const formState = formStateFactory(
      {
        integrationDependencies: [integrationDependency1],
      },
      pipelineFactory({
        config: {
          integration: makeVariableExpression(integrationDependency1.outputKey),
        },
      }),
    );
    render(
      <RequireIntegrationConfig
        integrationFieldSchema={integrationFieldSchema}
        integrationFieldName="extension.blockPipeline[0].config.integration"
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
    await expect(
      screen.findByText(
        "The configuration for this integration is invalid. Check your credentials and try again.",
      ),
    ).resolves.toBeInTheDocument();
    // Click the retry button
    await waitFor(() => {
      screen.getByText("Retry").click();
    });
    // Error alert should still be visible
    expect(
      screen.getByText(
        "The configuration for this integration is invalid. Check your credentials and try again.",
      ),
    ).toBeInTheDocument();
    expect(checkIntegrationAuthMock).toHaveBeenCalledTimes(2);
  });
});
