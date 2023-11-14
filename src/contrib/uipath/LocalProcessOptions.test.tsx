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
import { render, screen } from "@testing-library/react";
import LocalProcessOptions from "@/contrib/uipath/LocalProcessOptions";
import * as contentScriptApi from "@/contentScript/messenger/api";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import { UIPATH_ID } from "@/contrib/uipath/localProcess";
import { waitForEffect } from "@/testUtils/testHelpers";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import * as auth from "@/hooks/auth";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import { valueToAsyncState } from "@/utils/asyncStateUtils";
import { setContext } from "@/testUtils/detectPageMock";
import { menuItemFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { integrationDependencyFactory } from "@/testUtils/factories/integrationFactories";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import useSanitizedIntegrationConfigFormikAdapter from "@/integrations/useSanitizedIntegrationConfigFormikAdapter";

setContext("devToolsPage");

jest.mock("@/integrations/useSanitizedIntegrationConfigFormikAdapter", () => ({
  __esModule: true,
  default: jest.fn(),
}));

const useSanitizedIntegrationConfigFormikAdapterMock = jest.mocked(
  useSanitizedIntegrationConfigFormikAdapter
);

jest.mock("@/hooks/auth");
jest.mock("@/contrib/uipath/uipathHooks");
jest.mock("@/hooks/auth");
jest.mock("@/contentScript/messenger/api");
jest.mock("@/contrib/uipath/uipathHooks", () => {
  const mock = jest.requireActual("@/contrib/uipath/uipathHooks");
  return {
    __esModule: true,
    ...mock,
    useSelectedRelease: jest.fn().mockResolvedValue({
      selectedRelease: null,
      releasePromise: Promise.resolve([]),
    }),
  };
});
jest.mock("@/components/form/widgets/RemoteSelectWidget", () => {
  const mock = jest.requireActual(
    "@/components/form/widgets/RemoteSelectWidget"
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
        id: UIPATH_ID,
        config: {
          service: null,
          releaseKey: null,
          inputArguments: {},
        },
      },
    ]
  );
}

function renderOptions(formState: ModComponentFormState = makeBaseState()) {
  return render(
    <Formik onSubmit={jest.fn()} initialValues={formState}>
      <LocalProcessOptions
        name="extension.blockPipeline.0"
        configKey="config"
      />
    </Formik>
  );
}

beforeEach(() => {
  useSanitizedIntegrationConfigFormikAdapterMock.mockReturnValue(
    valueToAsyncState(null)
  );
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

    await waitForEffect();

    expect(
      screen.getByText("UiPath Assistant consent code: abc123")
    ).toBeInTheDocument();
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
        } as unknown as SanitizedIntegrationConfig)
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
      ])
    );
    jest.mocked(contentScriptApi.getProcesses).mockResolvedValue([]);
    jest.mocked(contentScriptApi.initRobot).mockResolvedValue({
      available: true,
      consentCode: null,
      missingComponents: false,
    });

    const formState = makeBaseState();
    formState.integrationDependencies[0].configId = configId;
    formState.extension.blockPipeline[0].config.service = "@uipath";

    renderOptions();

    await waitForEffect();

    expect(
      screen.queryByText("UiPath Assistant consent code")
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText("Integration")).toBeInTheDocument();
    expect(screen.getByLabelText("Process")).toBeInTheDocument();
    expect(screen.getByText("Input Arguments")).toBeInTheDocument();
    expect(screen.getByText("Add Property")).toBeInTheDocument();
  });
});
