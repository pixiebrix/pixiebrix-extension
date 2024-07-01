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
import LocalProcessOptions from "@/contrib/uipath/LocalProcessOptions";
import * as contentScriptApi from "@/contentScript/messenger/api";
import RunLocalProcess from "@/contrib/uipath/localProcess";
import { waitForEffect } from "@/testUtils/testHelpers";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import * as auth from "@/hooks/auth";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { valueToAsyncState } from "@/utils/asyncStateUtils";
import { TEST_setContext } from "webext-detect";
import { menuItemFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { integrationDependencyFactory } from "@/testUtils/factories/integrationFactories";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import useSanitizedIntegrationConfigFormikAdapter from "@/integrations/useSanitizedIntegrationConfigFormikAdapter";
import { useSelectedRelease } from "@/contrib/uipath/uipathHooks";
import { render, screen } from "@/pageEditor/testHelpers";

TEST_setContext("devToolsPage");

jest.mock("@/integrations/useSanitizedIntegrationConfigFormikAdapter");

const useSanitizedIntegrationConfigFormikAdapterMock = jest.mocked(
  useSanitizedIntegrationConfigFormikAdapter,
);

jest.mock("@/hooks/auth");
jest.mock("@/contrib/uipath/uipathHooks");
jest.mock("@/hooks/auth");
jest.mock("@/contentScript/messenger/api");
jest.mock("@/contrib/uipath/uipathHooks");
const useSelectedReleaseMock = jest.mocked(useSelectedRelease);

jest.mock("@/components/form/widgets/RemoteSelectWidget", () => {
  const mock = jest.requireActual(
    "@/components/form/widgets/RemoteSelectWidget",
  );
  return {
    __esModule: true,
    ...mock,
    useOptionsResolver: jest.fn().mockReturnValue([[], false, undefined]),
  };
});

const integrationId = validateRegistryId("@uipath/cloud");

function makeBaseState() {
  return menuItemFormStateFactory(
    {
      integrationDependencies: [
        integrationDependencyFactory({
          integrationId,
          outputKey: validateOutputKey("uipath"),
        }),
      ],
    },
    [
      {
        id: RunLocalProcess.BRICK_ID,
        config: {
          service: null,
          releaseKey: null,
          inputArguments: {},
        },
      },
    ],
  );
}

function renderOptions(initialValues: ModComponentFormState = makeBaseState()) {
  return render(
    <LocalProcessOptions
      name="modComponent.brickPipeline.0"
      configKey="config"
    />,
    { initialValues },
  );
}

beforeEach(() => {
  useSanitizedIntegrationConfigFormikAdapterMock.mockReturnValue(
    valueToAsyncState(null),
  );
  useSelectedReleaseMock.mockReturnValue({
    selectedRelease: null,
    releasesPromise: Promise.resolve([]),
    releaseKey: null,
  });
});

describe("UiPath LocalProcess Options", () => {
  test("Can render options", async () => {
    jest.mocked(contentScriptApi.getProcesses).mockResolvedValue([]);
    jest.mocked(contentScriptApi.initRobot).mockResolvedValue({
      available: false,
      consentCode: null,
      missingComponents: false,
    });

    const { asFragment } = renderOptions();

    await waitForEffect();

    expect(screen.queryByText("UiPath Assistant not found")).toBeNull();
    expect(asFragment()).toMatchSnapshot();
  });

  test("Can render consent code and service selector", async () => {
    jest.mocked(auth.useAuthOptions).mockReturnValue(valueToAsyncState([]));
    jest.mocked(contentScriptApi.getProcesses).mockResolvedValue([]);
    jest.mocked(contentScriptApi.initRobot).mockResolvedValue({
      available: true,
      consentCode: "abc123",
      missingComponents: false,
    });

    renderOptions();

    await expect(
      screen.findByText("UiPath Assistant consent code: abc123"),
    ).resolves.toBeInTheDocument();
    expect(screen.getByLabelText("Integration")).toBeInTheDocument();
  });

  test("Can render arguments", async () => {
    const configId = uuidv4();
    useSanitizedIntegrationConfigFormikAdapterMock
      // Pass minimal arguments
      .mockReturnValue(
        valueToAsyncState({
          id: configId,
          serviceId: integrationId,
        } as unknown as SanitizedIntegrationConfig),
      );

    jest.mocked(auth.useAuthOptions).mockReturnValue(
      valueToAsyncState([
        {
          label: "Test Auth",
          value: configId,
          serviceId: integrationId,
          local: true,
          sharingType: "private",
        },
      ]),
    );
    jest.mocked(contentScriptApi.getProcesses).mockResolvedValue([]);
    jest.mocked(contentScriptApi.initRobot).mockResolvedValue({
      available: true,
      consentCode: null,
      missingComponents: false,
    });

    useSelectedReleaseMock.mockReturnValue({
      selectedRelease: {
        release: null,
        schema: {
          type: "object",
          properties: {
            Arg1: {
              type: "string",
              title: "Argument One",
            },
            Arg2: {
              type: "string",
              title: "Argument Two",
            },
          },
        },
      },
      releasesPromise: Promise.resolve([]),
      releaseKey: null,
    });

    const formState = makeBaseState();
    formState.integrationDependencies[0].configId = configId;
    formState.modComponent.brickPipeline[0].config.service = "@uipath";

    renderOptions();

    await expect(
      screen.findByLabelText("Integration"),
    ).resolves.toBeInTheDocument();
    expect(
      screen.queryByText("UiPath Assistant consent code"),
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Process")).toBeInTheDocument();
    expect(screen.getByText("Input Arguments")).toBeInTheDocument();
    expect(screen.getByText("Argument One")).toBeInTheDocument();
    expect(screen.getByText("Argument Two")).toBeInTheDocument();
  });
});
