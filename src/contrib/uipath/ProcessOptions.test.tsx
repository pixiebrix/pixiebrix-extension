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
// eslint-disable-next-line no-restricted-imports -- TODO: Fix over time
import { Formik } from "formik";
import { UIPATH_ID } from "@/contrib/uipath/localProcess";
import { waitForEffect } from "@/testUtils/testHelpers";
import { validateRegistryId } from "@/types/helpers";
import { type FormState } from "@/pageEditor/extensionPoints/formStateTypes";
import ProcessOptions from "@/contrib/uipath/ProcessOptions";
import { makeVariableExpression } from "@/runtime/expressionCreators";
import useDependency from "@/services/useDependency";
import registerDefaultWidgets from "@/components/fields/schemaFields/widgets/registerDefaultWidgets";
import { type OutputKey } from "@/types/runtimeTypes";
import { type IService } from "@/types/serviceTypes";
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

function renderOptions(formState: FormState = makeBaseState()) {
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
    const rendered = renderOptions();

    await waitForEffect();

    expect(rendered.queryByText("Integration")).not.toBeNull();
    expect(rendered.container).toMatchSnapshot();
  });

  test("Render with selected dependency", async () => {
    (useDependency as jest.Mock).mockReturnValue({
      // Values not needed here, just need to return something non-null
      config: {},
      service: {} as IService,
      hasPermissions: true,
      requestPermissions: jest.fn(),
    });

    const base = makeBaseState();
    base.extension.blockPipeline[0].config.uipath =
      makeVariableExpression("@uipath");

    const rendered = renderOptions(base);

    await waitForEffect();

    expect(rendered.queryByText("Integration")).not.toBeNull();
    expect(rendered.queryByText("Release")).not.toBeNull();
    expect(rendered.queryByText("Strategy")).not.toBeNull();
    expect(rendered.queryByText("Await Result")).not.toBeNull();
    expect(rendered.queryByText("Result Timeout (Milliseconds)")).toBeNull();
    expect(rendered.container).toMatchSnapshot();
  });

  test("Render timeout field if await result", async () => {
    (useDependency as jest.Mock).mockReturnValue({
      // Values not needed here, just need to return something non-null
      config: {},
      service: {} as IService,
      hasPermissions: true,
      requestPermissions: jest.fn(),
    });

    const base = makeBaseState();
    base.extension.blockPipeline[0].config.uipath =
      makeVariableExpression("@uipath");
    base.extension.blockPipeline[0].config.awaitResult = true;

    const rendered = renderOptions(base);

    await waitForEffect();

    expect(
      rendered.queryByText("Result Timeout (Milliseconds)")
    ).not.toBeNull();
  });
});
