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
import { render, screen } from "@/extensionConsole/testHelpers";
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import { UIPATH_ID } from "@/contrib/uipath/localProcess";
import { waitForEffect } from "@/testUtils/testHelpers";
import { validateRegistryId } from "@/types/helpers";
import { type ModComponentFormState } from "@/pageEditor/starterBricks/formStateTypes";
import ProcessOptions from "@/contrib/uipath/ProcessOptions";
import { makeVariableExpression } from "@/runtime/expressionCreators";
import useDependency from "@/services/useDependency";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { type OutputKey } from "@/types/runtimeTypes";
import { type Integration } from "@/types/integrationTypes";
import { useAuthOptions } from "@/hooks/auth";
import { valueToAsyncState } from "@/utils/asyncStateUtils";
import { setContext } from "@/testUtils/detectPageMock";
import { menuItemFormStateFactory } from "@/testUtils/factories/pageEditorFactories";

setContext("devToolsPage");

// Default mock to return missing dependency
jest.mock("@/services/useDependency", () =>
  jest.fn().mockReturnValue({
    config: undefined,
    service: undefined,
    hasPermissions: true,
    requestPermissions: jest.fn(),
  })
);
jest.mock("@/hooks/auth", () => ({
  useAuthOptions: jest.fn(),
}));
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

const serviceId = validateRegistryId("@uipath/cloud");

function makeBaseState() {
  const baseFormState = menuItemFormStateFactory();
  baseFormState.services = [
    { id: serviceId, outputKey: "uipath" as OutputKey },
  ];
  baseFormState.extension.blockPipeline = [
    {
      id: UIPATH_ID,
      config: {
        uipath: null,
        releaseKey: null,
        inputArguments: {},
      },
    },
  ];
  return baseFormState;
}

function renderOptions(formState: ModComponentFormState = makeBaseState()) {
  return render(
    <Formik onSubmit={jest.fn()} initialValues={formState}>
      <ProcessOptions name="extension.blockPipeline.0" configKey="config" />
    </Formik>
  );
}

beforeAll(() => {
  registerDefaultWidgets();
  (useAuthOptions as jest.Mock).mockReturnValue(valueToAsyncState([]));
});

describe("UiPath Options", () => {
  test("Render integration selector", async () => {
    const { asFragment } = renderOptions();

    await waitForEffect();

    expect(screen.getByText("Integration")).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  test("Render with selected dependency", async () => {
    (useDependency as jest.Mock).mockReturnValue({
      // Values not needed here, just need to return something non-null
      config: {},
      service: {} as Integration,
      hasPermissions: true,
      requestPermissions: jest.fn(),
    });

    const base = makeBaseState();
    base.extension.blockPipeline[0].config.uipath =
      makeVariableExpression("@uipath");

    const { asFragment } = renderOptions(base);

    await waitForEffect();

    expect(screen.getByText("Integration")).toBeInTheDocument();
    expect(screen.getByText("Release")).toBeInTheDocument();
    expect(screen.getByText("Strategy")).toBeInTheDocument();
    expect(screen.getByText("Await Result")).toBeInTheDocument();
    expect(screen.queryByText("Result Timeout (Milliseconds)")).toBeNull();
    expect(asFragment()).toMatchSnapshot();
  });

  test("Render timeout field if await result", async () => {
    (useDependency as jest.Mock).mockReturnValue({
      // Values not needed here, just need to return something non-null
      config: {},
      service: {} as Integration,
      hasPermissions: true,
      requestPermissions: jest.fn(),
    });

    const base = makeBaseState();
    base.extension.blockPipeline[0].config.uipath =
      makeVariableExpression("@uipath");
    base.extension.blockPipeline[0].config.awaitResult = true;

    renderOptions(base);

    await waitForEffect();

    expect(
      screen.getByText("Result Timeout (Milliseconds)")
    ).toBeInTheDocument();
  });
});
