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
import { render, screen } from "@/extensionConsole/testHelpers";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import { UIPATH_ID } from "@/contrib/uipath/process";
import { validateRegistryId } from "@/types/helpers";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import ProcessOptions from "@/contrib/uipath/ProcessOptions";
import useSanitizedIntegrationConfigFormikAdapter from "@/integrations/useSanitizedIntegrationConfigFormikAdapter";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { type SanitizedIntegrationConfig } from "@/integrations/integrationTypes";
import { useAuthOptions } from "@/hooks/auth";
import { valueToAsyncState } from "@/utils/asyncStateUtils";
import { TEST_setContext } from "webext-detect";
import { menuItemFormStateFactory } from "@/testUtils/factories/pageEditorFactories";
import { integrationDependencyFactory } from "@/testUtils/factories/integrationFactories";
import { validateOutputKey } from "@/runtime/runtimeTypes";
import { toExpression } from "@/utils/expressionUtils";
import { useSelectedRelease } from "@/contrib/uipath/uipathHooks";

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
        id: UIPATH_ID,
        config: {
          uipath: null,
          releaseKey: null,
          inputArguments: {},
        },
      },
    ],
  );
}

function renderOptions(formState: ModComponentFormState = makeBaseState()) {
  return render(
    <Formik onSubmit={jest.fn()} initialValues={formState}>
      <ProcessOptions name="extension.blockPipeline.0" configKey="config" />
    </Formik>,
  );
}

beforeAll(() => {
  registerDefaultWidgets();
  jest.mocked(useAuthOptions).mockReturnValue(valueToAsyncState([]));
});

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

describe("UiPath Options", () => {
  test("Render integration selector", async () => {
    const { asFragment } = renderOptions();
    await expect(screen.findByText("Integration")).resolves.toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  test("Render with selected dependency and inputs", async () => {
    useSanitizedIntegrationConfigFormikAdapterMock.mockReturnValue(
      // Values not needed here, just need to return something non-null
      valueToAsyncState({} as unknown as SanitizedIntegrationConfig),
    );

    const base = makeBaseState();
    base.extension.blockPipeline[0].config.uipath = toExpression(
      "var",
      "@uipath",
    );

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

    renderOptions(base);

    await expect(screen.findByText("Integration")).resolves.toBeInTheDocument();
    expect(screen.getByText("Release")).toBeInTheDocument();
    expect(screen.getByText("Strategy")).toBeInTheDocument();
    expect(screen.getByText("Await Result")).toBeInTheDocument();
    // Timeout field doesn't show up until Await Result is toggled on
    expect(
      screen.queryByText("Result Timeout (Milliseconds)"),
    ).not.toBeInTheDocument();
    // Expect input parameters to be visible
    expect(screen.getByText("Argument One")).toBeInTheDocument();
    expect(screen.getByText("Argument Two")).toBeInTheDocument();
  });

  test("Render timeout field if await result", async () => {
    useSanitizedIntegrationConfigFormikAdapterMock.mockReturnValue(
      // Values not needed here, just need to return something non-null
      valueToAsyncState({} as unknown as SanitizedIntegrationConfig),
    );

    const base = makeBaseState();
    base.extension.blockPipeline[0].config.uipath = toExpression(
      "var",
      "@uipath",
    );
    base.extension.blockPipeline[0].config.awaitResult = true;

    renderOptions(base);

    await expect(
      screen.findByText("Result Timeout (Milliseconds)"),
    ).resolves.toBeInTheDocument();
  });
});
