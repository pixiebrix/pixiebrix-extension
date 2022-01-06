/*
 * Copyright (C) 2021 PixieBrix, Inc.
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
import { render } from "@testing-library/react";
import LocalProcessOptions from "@/contrib/uipath/LocalProcessOptions";
import * as contentScriptApi from "@/contentScript/messenger/api";
import { Formik } from "formik";
import {
  activeDevToolContextFactory,
  menuItemFormStateFactory,
} from "@/tests/factories";
import { UIPATH_ID } from "@/contrib/uipath/localProcess";
import { waitForEffect } from "@/tests/testHelpers";
import { DevToolsContext } from "@/devTools/context";
import { uuidv4, validateRegistryId } from "@/types/helpers";
import { OutputKey, SanitizedServiceConfiguration } from "@/core";
import * as auth from "@/hooks/auth";
import * as dependencyHooks from "@/services/useDependency";
import { FormState } from "@/devTools/editor/slices/editorSlice";
import { Service } from "@/types";

jest.mock("webext-detect-page", () => ({
  isDevToolsPage: () => true,
  isBackground: () => false,
  isExtensionContext: () => false,
}));

jest.mock("@/services/useDependency", () =>
  jest.fn().mockReturnValue({
    // Pass minimal arguments
    config: undefined,
    service: undefined,
    hasPermissions: true,
    requestPermissions: jest.fn(),
  })
);
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
  const baseFormState = menuItemFormStateFactory({});
  baseFormState.services = [
    { id: serviceId, outputKey: "uipath" as OutputKey },
  ];
  baseFormState.extension.blockPipeline = [
    {
      id: UIPATH_ID,
      config: {
        service: null,
        releaseKey: null,
        inputArguments: {},
      },
    },
  ];
  return baseFormState;
}

function renderOptions(formState: FormState = makeBaseState()) {
  return render(
    <DevToolsContext.Provider value={activeDevToolContextFactory()}>
      <Formik onSubmit={jest.fn()} initialValues={formState}>
        <LocalProcessOptions
          name="extension.blockPipeline.0"
          configKey="config"
        />
      </Formik>
    </DevToolsContext.Provider>
  );
}

describe("UiPath LocalProcess Options", () => {
  test("Can render options", async () => {
    (contentScriptApi.getProcesses as jest.MockedFunction<
      typeof contentScriptApi.getProcesses
    >).mockResolvedValue([]);
    (contentScriptApi.initRobot as jest.MockedFunction<
      typeof contentScriptApi.initRobot
    >).mockResolvedValue({
      available: false,
      consentCode: null,
      missingComponents: false,
    });

    const rendered = renderOptions();

    await waitForEffect();

    expect(rendered.queryByText("UiPath Assistant not found")).toBeNull();
    expect(rendered.container).toMatchSnapshot();
  });

  test("Can render consent code and service selector", async () => {
    (auth.useAuthOptions as jest.MockedFunction<
      typeof auth.useAuthOptions
    >).mockReturnValue([[], jest.fn()]);
    (contentScriptApi.getProcesses as jest.MockedFunction<
      typeof contentScriptApi.getProcesses
    >).mockResolvedValue([]);
    (contentScriptApi.initRobot as jest.MockedFunction<
      typeof contentScriptApi.initRobot
    >).mockResolvedValue({
      available: true,
      consentCode: "abc123",
      missingComponents: false,
    });

    const rendered = renderOptions();

    await waitForEffect();

    expect(
      rendered.queryByText("UiPath Assistant consent code: abc123")
    ).not.toBeNull();
    expect(rendered.queryByLabelText("Integration")).not.toBeNull();
  });

  test("Can render arguments", async () => {
    const config = uuidv4();

    (dependencyHooks.default as jest.MockedFunction<
      typeof dependencyHooks.default
    >).mockReturnValue({
      // Pass minimal arguments
      config: ({
        id: config,
        serviceId,
      } as unknown) as SanitizedServiceConfiguration,
      service: ({ id: serviceId } as unknown) as Service,
      hasPermissions: true,
      requestPermissions: jest.fn(),
    });
    (auth.useAuthOptions as jest.MockedFunction<
      typeof auth.useAuthOptions
    >).mockReturnValue([
      [{ label: "Test Auth", value: config, serviceId, local: true }],
      jest.fn(),
    ]);
    (contentScriptApi.getProcesses as jest.MockedFunction<
      typeof contentScriptApi.getProcesses
    >).mockResolvedValue([]);
    (contentScriptApi.initRobot as jest.MockedFunction<
      typeof contentScriptApi.initRobot
    >).mockResolvedValue({
      available: true,
      consentCode: null,
      missingComponents: false,
    });

    const formState = makeBaseState();
    formState.services[0].config = config;
    formState.extension.blockPipeline[0].config.service = "@uipath";

    const rendered = renderOptions();

    await waitForEffect();

    expect(rendered.queryByText("UiPath Assistant consent code")).toBeNull();
    expect(rendered.queryByLabelText("Integration")).not.toBeNull();
    expect(rendered.queryByLabelText("Process")).not.toBeNull();
    expect(rendered.queryByText("Input Arguments")).not.toBeNull();
    expect(rendered.queryByText("Add Property")).not.toBeNull();
  });
});
